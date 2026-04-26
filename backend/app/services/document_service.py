import os
import tempfile
from fastapi import UploadFile
from langchain_community.document_loaders import (
    PyPDFLoader, 
    TextLoader, 
    Docx2txtLoader, 
    CSVLoader
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.vector_service import add_chunks_to_vector_db

async def process_and_store_document(file: UploadFile):
    # Вземаме разширението на файла (напр. '.pdf', '.docx', '.txt')
    file_extension = os.path.splitext(file.filename)[1].lower()

    # Създаваме временния файл с правилното разширение
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        # Избираме правилния инструмент (Loader) според файла
        if file_extension == ".pdf":
            loader = PyPDFLoader(temp_path)
        elif file_extension == ".txt":
            loader = TextLoader(temp_path, encoding="utf-8")
        elif file_extension == ".docx":
            loader = Docx2txtLoader(temp_path)
        elif file_extension == ".csv":
            loader = CSVLoader(temp_path, encoding="utf-8")
        else:
            raise ValueError(f"Неподдържан файлов формат: {file_extension}. Моля, качете PDF, TXT, DOCX или CSV.")

        # Извличаме съдържанието
        docs = loader.load()
        
        # Добавяме името на файла към метаданните, за да можем да търсим по него
        for doc in docs:
            doc.metadata["filename"] = file.filename

        # Разделяме текста на парчета (Chunks)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)

        # Записваме векторите в базата данни (ChromaDB)
        add_chunks_to_vector_db(chunks)

        return {
            "filename": file.filename,
            "pages": len(docs),
            "chunks": len(chunks)
        }
        
    except Exception as e:
        raise Exception(f"Грешка при обработка на файла: {str(e)}")
        
    finally:
        # Почистваме временния файл, за да не пълним паметта
        if os.path.exists(temp_path):
            os.remove(temp_path)