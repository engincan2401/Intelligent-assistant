from langchain_ollama import ChatOllama
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from app.services.vector_service import embedding_model, CHROMA_PATH

llm = ChatOllama(model="llama3", temperature=0.1)

PROMPT_TEMPLATE = """
Ти си полезен AI асистент. Използвай САМО следния контекст, за да отговориш на въпроса. 
Ако отговорът не се съдържа в контекста, кажи "Не мога да намеря информация по този въпрос в предоставения документ.", не си измисляй факти.
Отговаряй винаги на Български език!

Контекст:
{context}

Въпрос: {question}

Отговор:
"""

prompt = PromptTemplate(template=PROMPT_TEMPLATE, input_variables=["context", "question"]) 


def generate_answer(question: str):

    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )

    # Оптимизация с MMR (Maximal Marginal Relevance)
    retriever = db.as_retriever(
        search_type="mmr", 
        search_kwargs={
            "k": 3,              # Брой финални резултати, които ще подадем на LLM-а
            "fetch_k": 10,       # Изтегля първо 10 релевантни резултата от базата
            "lambda_mult": 0.5   # Балансира (0 = пълно разнообразие, 1 = максимална релевантност)
        }
    )
    docs = retriever.invoke(question)

    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])

    final_prompt = prompt.format(context=context_text, question=question)
    response_text = llm.invoke(final_prompt)

    # Връщаме само текста (.content), защото ChatOllama връща AIMessage обект
    return response_text.content, docs