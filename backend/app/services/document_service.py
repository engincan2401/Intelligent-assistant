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

async def process_and_store_document(file: UploadFile, client_id: str = None, manager=None):
    # ПРОГРЕС: 10% - Създаване на временен файл
    if manager and client_id:
        await manager.send_progress(client_id, 10, f"Подготовка на файла: {file.filename}...")

    # Вземаме разширението на файла (напр. '.pdf', '.docx', '.txt')
    file_extension = os.path.splitext(file.filename)[1].lower()

    # Създаваме временния файл с правилното разширение
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
        temp_file.write(await file.read())
        temp_path = temp_file.name

    try:
        # ПРОГРЕС: 30% - Четене на съдържанието
        if manager and client_id:
            await manager.send_progress(client_id, 30, f"Четене и извличане на текст от файла...")

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

        # ПРОГРЕС: 60% - Разделяне на парчета
        if manager and client_id:
            await manager.send_progress(client_id, 60, "Разделяне на текста на интелигентни парчета (chunks)...")

        # Разделяме текста на парчета (Chunks)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_documents(docs)

        # ПРОГРЕС: 80% - Векторизиране
        if manager and client_id:
            await manager.send_progress(client_id, 80, "Векторизиране в базата данни (Това отнема най-много време)...")

        # Записваме векторите в базата данни (ChromaDB)
        add_chunks_to_vector_db(chunks)

        # ПРОГРЕС: 100% - Готово
        if manager and client_id:
            await manager.send_progress(client_id, 100, "Всичко е готово!")

        return {
            "filename": file.filename,
            "pages": len(docs),
            "chunks": len(chunks)
        }
        
    except Exception as e:
        if manager and client_id:
            await manager.send_progress(client_id, 0, f"Възникна грешка: {str(e)}")
        raise Exception(f"Грешка при обработка на файла: {str(e)}")
        
    finally:
        # Почистваме временния файл, за да не пълним паметта
        if os.path.exists(temp_path):
            os.remove(temp_path)