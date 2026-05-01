import json
import re
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from app.services.vector_service import embedding_model, CHROMA_PATH
from app.database import SessionLocal, ChatSession, ChatMessage

llm = ChatOllama(model="llama3", temperature=0.1)

bm25_cache = {}

_global_db = None

def get_db():
    """Връща инстанция на ChromaDB. Ако не е заредена, я зарежда само веднъж."""
    global _global_db
    if _global_db is None:
        print("⏳ Първоначално зареждане на векторната база (ChromaDB)...")
        _global_db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embedding_model,
            collection_name="diploma_documents"
        )
        print("✅ Базата е заредена успешно!")
    return _global_db

def custom_hybrid_search(question: str, db, filename: str = None, k: int = 4):
    """Комбинира векторно търсене (Chroma) и ключови думи (BM25) с кеширане."""
    search_kwargs = {"k": k}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
        
    vector_docs = db.similarity_search(question, **search_kwargs)
    bm25_docs = []
    
    # ДОБАВЕНО: Логика за кеширане
    global bm25_cache
    cache_key = filename if filename else "all"

    try:
        if cache_key not in bm25_cache:
            db_data = db.get(where={"filename": filename} if filename and filename != "all" else None)
            
            if db_data and db_data.get("documents") and len(db_data["documents"]) > 0:
                docs_for_bm25 = []
                for i in range(len(db_data["documents"])):
                    meta = db_data["metadatas"][i] if db_data.get("metadatas") else {}
                    docs_for_bm25.append(Document(page_content=db_data["documents"][i], metadata=meta))
                
                # Изчисляваме го веднъж и го запазваме в кеша
                bm25_cache[cache_key] = BM25Retriever.from_documents(docs_for_bm25)
        
        # Използваме вече готовия индекс от кеша
        if cache_key in bm25_cache:
            bm25_retriever = bm25_cache[cache_key]
            bm25_retriever.k = k
            bm25_docs = bm25_retriever.invoke(question)

    except Exception as e:
        print(f"BM25 грешка: {e}")



    all_docs = vector_docs + bm25_docs
    unique_docs = []
    seen_content = set()
    
    for doc in all_docs:
        if doc.page_content not in seen_content:
            unique_docs.append(doc)
            seen_content.add(doc.page_content)
            
    return unique_docs[:k]

def generate_followups(question: str, answer: str):
    """Генерира 3 логични следващи въпроса на база текущия разговор."""
    prompt = f"""На базата на този въпрос: "{question}" и този отговор: "{answer}", 
    генерирай точно 3 кратки и интересни следващи въпроса, които потребителят би задал.
    Всички въпроси трябва да са на български език.
    ВАЖНО: Върни резултата СТРОГО като JSON масив от стрингове. Без друг текст.
    Пример: ["Какво означава това?", "Дай ми пример.", "Какви са изключенията?"]
    """
    
    try:
        response = llm.invoke(prompt)
        match = re.search(r'\[\s*".*?"\s*\]', response.content, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return []
    except Exception as e:
        print("Грешка при генериране на follow-ups:", e)
        return []
    
async def needs_document_search(question: str) -> bool:
    """
    Бърз класификатор, който преценява дали въпросът изисква търсене в базата данни.
    """
    router_prompt = f"""Прецени дали следният въпрос изисква търсене в база данни с документи, или е просто общ разговор/поздрав.
Въпрос: "{question}"
Отговори САМО с 'YES' (ако трябва търсене в документи) или 'NO' (ако е общ разговор/поздрав). Никакви други думи!"""
    
    try:
        # Използваме ainvoke за бърз синхронен отговор от модела
        response = await llm.ainvoke(router_prompt)
        answer = response.content.strip().upper()
        
        # Ако моделът е върнал NO, значи не ни трябват документи
        if "NO" in answer:
            return False
        return True # Във всички останали случаи търсим в базата
    except Exception as e:
        print(f"Грешка в рутера: {e}")
        return True # При грешка се презастраховаме и търсим в базата

PERSONA_PROMPTS = {
    "default": """Ти си полезен AI асистент. 
ВАЖНО: ОТГОВАРЯЙ ВИНАГИ И ЕДИНСТВЕНО НА БЪЛГАРСКИ ЕЗИК (Bulgarian)!
Използвай следния контекст, за да отговориш на въпроса. Ако не знаеш отговора, кажи, че не знаеш.

Контекст: {context}
История: {history}
Въпрос: {question}

Отговор на български език:""",

    "simple": """Ти си много дружелюбен учител, който обяснява сложни концепции на 10-годишно дете. 
ВАЖНО: ОТГОВАРЯЙ ВИНАГИ И ЕДИНСТВЕНО НА БЪЛГАРСКИ ЕЗИК (Bulgarian)!
Използвай изключително прости думи, давай примери от ежедневието (игри, животни, училище) и бъди забавен.

Контекст: {context}
История: {history}
Въпрос: {question}

Отговор на български език:""",

    "expert": """Ти си академичен професор и експерт в областта. 
ВАЖНО: ОТГОВАРЯЙ ВИНАГИ И ЕДИНСТВЕНО НА БЪЛГАРСКИ ЕЗИК (Bulgarian)!
Давай изчерпателни, научно издържани, обективни и строго формални отговори. Използвай специализирана терминология.

Контекст: {context}
История: {history}
Въпрос: {question}

Експертен отговор на български език:""",

    "bullet_points": """Ти си AI асистент. 
ВАЖНО: ОТГОВАРЯЙ ВИНАГИ И ЕДИНСТВЕНО НА БЪЛГАРСКИ ЕЗИК (Bulgarian)!
Твоята задача е да отговаряш ИЗКЛЮЧИТЕЛНО И САМО под формата на кратки списъци (bullet points). Никакъв излишен текст преди или след списъка. Всяка точка трябва да е кратка и ясна.

Контекст: {context}
История: {history}
Въпрос: {question}

Списък на български език:"""
}

# 2. ОБНОВЕНАТА ФУНКЦИЯ ЗА СТРИЙМИНГ
async def stream_answer(question: str, chat_history: list, filename: str = None, persona: str = "default", session_id: int = None):
   # 1. Питаме Рутера дали изобщо да търсим в базата
    should_search = await needs_document_search(question)
    
    docs = []
    context_text = ""
    
    if should_search:
        print("🔍 Рутерът каза YES: Търсене в базата данни...")
        db = get_db()
        docs = custom_hybrid_search(question, db, filename, k=4)
        context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])
    else:
        print("💬 Рутерът каза NO: Директен разговор (без база данни).")
        context_text = "Няма прикачен контекст. Това е общ разговор."

    # Форматиране на историята
    history_text = ""
    if chat_history:
        for msg in chat_history:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            role_name = "Потребител" if role == "user" else "Асистент"
            history_text += f"{role_name}: {content}\n"

    # 3. ИЗБИРАМЕ ПРАВИЛНИЯ ПРОМПТ СПРЯМО ПЕРСОНАТА
    # Ако фронтендът прати непозната персона, използваме "default"
    raw_template = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["default"])
    
    prompt = PromptTemplate(template=raw_template, input_variables=["context", "question", "history"])
    final_prompt = prompt.format(context=context_text, question=question, history=history_text)

    full_response = ""
    
    # Стрийминг към фронтенда (както го направихме преди)
    async for chunk in llm.astream(final_prompt):
        full_response += chunk.content
        yield chunk.content

    # Добавяне на източници
    yield "\n\n===SOURCES===\n"
    sources_list = [{"content": doc.page_content, "page": doc.metadata.get("page", 0) + 1, "filename": doc.metadata.get("filename", "")} for doc in docs]
    yield json.dumps(sources_list)

    # Добавяне на следващи въпроси
    yield "\n\n===FOLLOW_UPS===\n"
    follow_ups = generate_followups(question, full_response)
    yield json.dumps(follow_ups)

    if session_id:
        db_session = SessionLocal()
        try:
            # Записваме въпроса на потребителя
            user_msg = ChatMessage(session_id=session_id, role="user", content=question)
            db_session.add(user_msg)
            
            # Записваме отговора на асистента
            assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=full_response)
            db_session.add(assistant_msg)
            
            # Обновяваме заглавието на чата (ако все още е "Нов разговор")
            chat_session = db_session.query(ChatSession).filter(ChatSession.id == session_id).first()
            if chat_session and chat_session.title == "Нов разговор":
                chat_session.title = question[:30] + "..."
                
            db_session.commit()
        except Exception as e:
            print(f"Грешка при запис в базата: {e}")
        finally:
            db_session.close()

def generate_document_summary(filename: str):
    """Генерира детайлно резюме на документа на база най-важните му части."""
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )
    
    # Търсим части, които вероятно съдържат цели, резюмета или въведения
    # Използваме по-голямо 'k', за да обхванем повече контекст
    search_kwargs = {"k": 12}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
        
    docs = db.similarity_search("цел, резюме, заключение, въведение, основни изводи", **search_kwargs)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

    prompt = f"""Ти си експерт в анализа на текстове. Твоята задача е да направиш структурирано и детайлно резюме на предоставения документ на БЪЛГАРСКИ ЕЗИК.
    
    Следвай тази структура:
    1. Основна тема (едно изречение).
    2. Ключови точки (bullet points).
    3. Кратко заключение.

    Текст за анализ:
    {context_text}

    Резюме:"""

    try:
        response = llm.invoke(prompt)
        return response.content
    except Exception as e:
        print(f"Грешка при генериране на резюме: {e}")
        return "Не успях да генерирам резюме за този документ."
    


def generate_flashcards(filename: str):
    """Генерира флашкарти на базата на избран документ (Bulletproof версия)."""
    
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )
    
    search_kwargs = {"k": 6}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
        
    # ВАЖНО: Търсим с реални думи, а не с празен стринг " ", за да не крашнем ChromaDB
    docs = db.similarity_search("Основни концепции, термини, дефиниции и правила", **search_kwargs)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])
    
    # ВАЖНО: Искаме обект, съдържащ масив, за да е съвместимо с format="json"
    prompt = f"""Ти си експертен AI учител. Твоята задача е да създадеш висококачествени флашкарти за учене.
    
    СТРИКТНИ ПРАВИЛА:
    1. Полето "question" ТРЯБВА да бъде реален ВЪПРОС, а не просто твърдение.
    2. Полето "answer" ТРЯБВА да съдържа конкретния и изчерпателен отговор.
    3. АБСОЛЮТНО ЗАБРАНЕНО е да правиш въпроси, на които отговорът е просто "Да" или "Не".
    
    ВЪРНИ ОТГОВОРА КАТО ВАЛИДЕН JSON ОБЕКТ с един ключ "flashcards", съдържащ масив от обектите.
    Пример:
    {{
      "flashcards": [
        {{"question": "Кой осъществява изпълнителната власт в общината?", "answer": "Кметът на общината."}}
      ]
    }}

    Контекст:
    {context_text}
    """
    
    json_llm = ChatOllama(model="llama3", temperature=0.1, format="json")
    response = json_llm.invoke(prompt)
    
    raw_text = response.content.strip()
    
    # 1. Почистване на Markdown (ако моделът е върнал ```json ... ```)
    if raw_text.startswith("```"):
        raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
        raw_text = re.sub(r"\n```$", "", raw_text)
        raw_text = raw_text.strip()
        
    # 2. Опит за парсване
    try:
        parsed_data = json.loads(raw_text)
        
        # Навигация до същинския масив
        if isinstance(parsed_data, dict) and "flashcards" in parsed_data:
            return parsed_data["flashcards"]
        elif isinstance(parsed_data, list):
            return parsed_data
        else:
            # Ако моделът си е измислил друг ключ (напр. "cards"), намираме първия масив
            for key, value in parsed_data.items():
                if isinstance(value, list):
                    return value
            return []
            
    except Exception as e:
        print("🚨 ГРЕШКА при парсване на флашкартите:", str(e))
        print("👀 Суров отговор от модела:", response.content)
        return []
    
def generate_quiz(filename: str, num_questions: int = 5):
    """Генерира тест с избираеми отговори на базата на документа."""
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )
    
    search_kwargs = {"k": 8}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
        
    docs = db.similarity_search("Основни факти, детайли и концепции", **search_kwargs)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])
    
    prompt = f"""Ти си експертен AI учител. Създай тест (quiz) с точно {num_questions} въпроса.
    
    СТРИКТНИ ПРАВИЛА:
    1. ЕЗИК: Всичко ТРЯБВА да е на БЪЛГАРСКИ ЕЗИК. Без английски.
    2. ФОРМАТ: За всеки въпрос създай точно 4 възможни отговора (options).
    3. ВЕРЕН ОТГОВОР: САМО ЕДИН от четирите отговора трябва да е верен ("is_correct": true). Другите три са грешни ("is_correct": false).
    4. ОБЯСНЕНИЕ: Добави кратко обяснение ("explanation") защо отговорът е верен.
    
    ВЪРНИ ОТГОВОРА КАТО ВАЛИДЕН JSON ОБЕКТ с един ключ "questions", съдържащ масива.
    
    Пример:
    {{
      "questions": [
        {{
          "question": "Коя е столицата на България?",
          "options": [
            {{"text": "Пловдив", "is_correct": false}},
            {{"text": "София", "is_correct": true}},
            {{"text": "Варна", "is_correct": false}},
            {{"text": "Бургас", "is_correct": false}}
          ],
          "explanation": "София е избрана за столица през 1879 г."
        }}
      ]
    }}

    Контекст за генериране:
    {context_text}
    """
    
    json_llm = ChatOllama(model="llama3", temperature=0.2, format="json")
    response = json_llm.invoke(prompt)
    
    raw_text = response.content.strip()
    if raw_text.startswith("```"):
        import re
        raw_text = re.sub(r"^```(?:json)?\n", "", raw_text)
        raw_text = re.sub(r"\n```$", "", raw_text)
        raw_text = raw_text.strip()
        
    try:
        parsed_data = json.loads(raw_text)
        if isinstance(parsed_data, dict) and "questions" in parsed_data:
            return parsed_data["questions"]
        elif isinstance(parsed_data, list):
            return parsed_data
        for key, value in parsed_data.items():
            if isinstance(value, list):
                return value
        return []
    except Exception as e:
        print("🚨 ГРЕШКА при парсване на теста:", str(e))
        return []