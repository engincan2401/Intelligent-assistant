import os 
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.document_service import process_pdf
from app.services.vector_service import add_chunks_to_vector_db

router = APIRouter()

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Моля, качете само PDF файлове.")
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при запазване: {str(e)}")
    

    try:
        chunks = process_pdf(file_path)
        success = add_chunks_to_vector_db(chunks)

        if not success:
            raise HTTPException(status_code=500, detail="Грешка при запис във векторната база.")

        return{
            "message": "Файлът е обработен успешно",
            "filename": file.filename,
            "total_pages": len(set([c.metadata.get("page") for c in chunks])),
            "total_chunks": len(chunks),
            "status": "ready_for_rag"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при обработка: {str(e)}")
    