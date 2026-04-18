import os
import tempfile
from fastapi import UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.vector_service import add_chunks_to_vector_db

async def process_and_store_document(file: UploadFile):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        loader = PyPDFLoader(temp_path)
        docs = loader.load()
        
        for doc in docs:
            doc.metadata["filename"] = file.filename

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)

        add_chunks_to_vector_db(chunks)

        return {
            "filename": file.filename,
            "pages": len(docs),
            "chunks": len(chunks)
        }
        
    except Exception as e:
        raise Exception(f"Грешка при обработка на PDF: {str(e)}")
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)