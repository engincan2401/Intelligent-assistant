from langchain_community.llms import Ollama
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from app.services.vector_service import embedding_model, CHROMA_PATH

llm = Ollama(model="llama3", temperature=0.1)

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

    retriever = db.as_retriever(search_kwargs={"k": 3})
    docs = retriever.invoke(question)

    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])


    final_prompt = prompt.format(context=context_text, question=question)
    response_text = llm.invoke(final_prompt)

    return response_text, docs