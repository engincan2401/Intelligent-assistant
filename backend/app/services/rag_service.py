import json
import re
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from app.services.vector_service import embedding_model, CHROMA_PATH

llm = ChatOllama(model="llama3", temperature=0.1)

def custom_hybrid_search(question: str, db, filename: str = None, k: int = 4):
    """Собствена имплементация на Хибридно търсене (Вектори + Ключови думи)"""
    
    search_kwargs = {"k": k}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
    
    vector_docs = db.similarity_search(question, **search_kwargs)
    
    bm25_docs = []
    try:
        db_data = db.get(where={"filename": filename} if filename and filename != "all" else None)
        
        if db_data and db_data.get("documents") and len(db_data["documents"]) > 0:
            docs_for_bm25 = []
            for i in range(len(db_data["documents"])):
                meta = db_data["metadatas"][i] if db_data.get("metadatas") else {}
                docs_for_bm25.append(Document(page_content=db_data["documents"][i], metadata=meta))
                
            bm25_retriever = BM25Retriever.from_documents(docs_for_bm25)
            bm25_retriever.k = k
            bm25_docs = bm25_retriever.invoke(question)
    except Exception as e:
        print(f"BM25 търсенето беше пропуснато: {e}")

    
    print(f"--> Намерени чрез Вектори (Смисъл): {vector_docs} парчета текст")
    print(f"--> Намерени чрез BM25 (Точни думи): {bm25_docs} парчета текст")

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

def stream_answer(question: str, chat_history: list, filename: str = None, persona: str = "default"):
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )

    docs = custom_hybrid_search(question, db, filename, k=4)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

    history_text = ""
    if chat_history:
        for msg in chat_history:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            role_name = "Потребител" if role == "user" else "Асистент"
            history_text += f"{role_name}: {content}\n"
    else:
        history_text = "Няма предишни съобщения."

    custom_template = """Ти си полезен AI асистент. 
    ВАЖНО ПРАВИЛО: Отговаряй ВИНАГИ и САМО на български език, независимо от всичко!

    Използвай следния контекст от документи, за да отговориш на въпроса.

    Контекст:
    {context}

    История на разговора:
    {history}

    Въпрос: {question}

    Отговор на български език:"""

    prompt = PromptTemplate(template=custom_template, input_variables=["context", "question", "history"])
    final_prompt = prompt.format(context=context_text, question=question, history=history_text)

    full_response = ""
    for chunk in llm.stream(final_prompt):
        full_response += chunk.content
        yield chunk.content

    yield "\n\n===SOURCES===\n"
    sources_list = [{"content": doc.page_content, "page": doc.metadata.get("page", 0) + 1} for doc in docs]
    yield json.dumps(sources_list)

    yield "\n\n===FOLLOW_UPS===\n"
    follow_ups = generate_followups(question, full_response)
    yield json.dumps(follow_ups)

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
    """Генерира флашкарти за учене на базата на документа."""
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )
    
    search_kwargs = {"k": 6}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}
        
    docs = db.similarity_search("дефиниции, основни понятия, концепции, правила", **search_kwargs)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

    prompt = f"""Ти си AI асистент за обучение. Извлечи 5 до 7 от най-важните концепции от следния текст и създай флашкарти за учене.
    
    ВАЖНО: Трябва да върнеш резултата СТРОГО като JSON масив (array) от обекти. 
    Всеки обект трябва да има точно два ключа: "question" (Въпрос) и "answer" (Отговор).
    Всички текстове трябва да са на български език.
    Не добавяй НИКАКЪВ друг текст, обяснения или форматиране извън JSON масива.

    Текст за анализ:
    {context_text}
    """

    response = llm.invoke(prompt)
    raw_text = response.content

    try:
        match = re.search(r'\[\s*\{.*?\}\s*\]', raw_text, re.DOTALL)
        if match:
            json_str = match.group(0)
            cards = json.loads(json_str)
            return cards
        else:
            return []
    except Exception as e:
        print("Грешка при парсване на флашкарти:", e)
        return []