from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.document_service import process_and_store_document
from app.models.schemas import DocumentInfo
from app.services.vector_service import embedding_model, CHROMA_PATH
from langchain_chroma import Chroma

router = APIRouter()

@router.post("/upload", response_model=DocumentInfo)
async def upload_document(file: UploadFile = File(...)):
    
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Моля, качете PDF файл.")
    
    try:
        doc_info = await process_and_store_document(file)
        return doc_info
    except Exception as e:
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