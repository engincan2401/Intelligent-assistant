import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

CHROMA_PATH = "data/chroma_db"
os.makedirs(CHROMA_PATH, exist_ok=True)

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={'device': 'cpu'},
    encode_kwargs={'normalize_embeddings': True}
)

def add_chunks_to_vector_db(chunks):
    if not chunks:
        return False
    

    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
        )

    db.add_documents(chunks)

    return True