import json
import re
from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from app.services.vector_service import embedding_model, CHROMA_PATH

llm = ChatOllama(model="llama3", temperature=0.1)

# PROMPT_TEMPLATE = """
# Ти си полезен AI асистент. Използвай следния контекст от документи и историята на разговора, за да отговориш на въпроса. 
# Ако отговорът не се съдържа в контекста, кажи "Не мога да намеря информация по този въпрос в предоставения документ.", не си измисляй факти.
# Отговаряй винаги на Български език!

# История на разговора до момента:
# {history}

# Контекст от документа:
# {context}

# Въпрос: {question}

# Отговор:
# """

# prompt = PromptTemplate(template=PROMPT_TEMPLATE, input_variables=["context", "question", "history"]) 




def stream_answer(question: str, chat_history: list, filename: str = None, persona: str = "default"):
    history_text = ""
    if chat_history:
        for msg in chat_history:
            role_name = "Потребител" if msg.role == "user" else "Асистент"
            history_text += f"{role_name}: {msg.content}\n"
    else:
        history_text = "Няма предишни съобщения."

    search_kwargs = {"k": 3, "fetch_k": 10, "lambda_mult": 0.5}
    if filename and filename != "all":
        search_kwargs["filter"] = {"filename": filename}

    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )
    
    retriever = db.as_retriever(search_type="mmr", search_kwargs=search_kwargs)
    docs = retriever.invoke(question)
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

    PERSONAS = {
        "default": "Ти си полезен и вежлив AI асистент. Отговаряй точно и ясно на базата на предоставения контекст.",
        "simple": "Обяснявай концепциите изключително просто, сякаш говоря с 10-годишно дете. Използвай лесни думи, забавни аналогии от реалния живот и избягвай сложен жаргон.",
        "expert": "Ти си строг академичен професор и старши изследовател. Отговаряй с висока степен на експертност, използвай специализирана терминология и бъди максимално детайлен.",
        "bullet_points": "Ти си бизнес анализатор. Винаги структурирай отговорите си САМО в кратки и ясни списъци с водещи символи (bullet points), без дълги въведения."
    }
    
    system_instruction = PERSONAS.get(persona, PERSONAS["default"])

    # Добавяме изрична команда за български език, която да важи за всички роли!
    custom_template = f"""{system_instruction}
    
    ВАЖНО ПРАВИЛО: Отговаряй ВИНАГИ и САМО на български език, независимо от всичко!

    Използвай следния контекст от документи, за да отговориш на въпроса. Ако отговорът не се съдържа в контекста, кажи че не разполагаш с тази информация (отново на български език).

    Контекст:
    {{context}}

    История на разговора:
    {{history}}

    Въпрос: {{question}}

    Отговор на български език:"""

    dynamic_prompt = PromptTemplate(template=custom_template, input_variables=["context", "question", "history"])
    final_prompt = dynamic_prompt.format(context=context_text, question=question, history=history_text)

    for chunk in llm.stream(final_prompt):
        yield chunk.content

    yield "\n\n===SOURCES===\n"
    sources_list = [{"content": doc.page_content, "page": doc.metadata.get("page", 0) + 1} for doc in docs]
    yield json.dumps(sources_list)

def generate_flashcards(filename: str):
    
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