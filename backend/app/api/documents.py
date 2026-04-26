import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.document_service import process_and_store_document
from app.models.schemas import DocumentInfo
from app.services.vector_service import embedding_model, CHROMA_PATH
from langchain_chroma import Chroma


router = APIRouter()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    # 1. Вземаме разширението на файла
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".pdf", ".docx", ".txt", ".csv"]

    # 2. Проверяваме дали е в новия списък с позволени формати
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Неподдържан файлов формат ({file_extension}). Разрешени са: PDF, DOCX, TXT, CSV."
        )

    # 3. Предаваме го на нашия обновен сървис
    try:
        result = await process_and_store_document(file)
        return result
    except Exception as e:
        # Ако гръмне при самото четене, връщаме 500 Internal Server Error
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/list")
async def list_documents():
   
    try:
        db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embedding_model,
            collection_name="diploma_documents"
        )
        
        result = db.get(include=["metadatas"])
        metadatas = result.get("metadatas", [])
        
        
        unique_files = set()
        for meta in metadatas:
            if meta and "filename" in meta:
                unique_files.add(meta["filename"])
        
        return {"documents": list(unique_files)}
    except Exception as e:
        
        return {"documents": []}
    
@router.delete("/delete/{filename}")

async def delete_document(filename: str):
    try:
        db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embedding_model,
            collection_name="diploma_documents"
        )
        
        
        db.delete(where={"filename": filename})
        
        return {"message": f"Документът {filename} беше изтрит успешно."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при изтриване: {str(e)}")
    
@router.get("/summary/{filename}")
async def get_summary(filename: str):
    from app.services.rag_service import generate_document_summary
    try:
        summary = generate_document_summary(filename)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при резюмиране: {str(e)}")