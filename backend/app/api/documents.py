import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict
from app.services.document_service import process_and_store_document
from app.services.vector_service import embedding_model, CHROMA_PATH
from langchain_chroma import Chroma
from app.services.rag_service import clear_bm25_cache
router = APIRouter()

# --- 1. МЕНИДЖЪР ЗА WEBSOCKETS ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_progress(self, client_id: str, progress: int, message: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json({
                "progress": progress, 
                "message": message
            })

manager = ConnectionManager()

@router.websocket("/ws/progress/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Държим връзката отворена
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)

# --- 2. ОБНОВЕН UPLOAD ENDPOINT ---
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    client_id: str = Form(None) # Приемаме клиентското ID
):
    file_extension = os.path.splitext(file.filename)[1].lower()
    allowed_extensions = [".pdf", ".docx", ".txt", ".csv"]

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Неподдържан файлов формат. Разрешени са: PDF, DOCX, TXT, CSV."
        )

    try:
        # Подаваме client_id и manager-а към сървиса, за да може той да изпраща прогреса!
        result = await process_and_store_document(file, client_id, manager)
        return result
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
        # 1. Изтриване на векторите от ChromaDB
        db = Chroma(
            persist_directory=CHROMA_PATH,
            embedding_function=embedding_model,
            collection_name="diploma_documents"
        )
        db.delete(where={"filename": filename})

        # 2. Изтриване на физическия файл от папката uploads/
        file_path = os.path.join("uploads", filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Физическият файл {filename} е изтрит от сървъра.")

        # 3. Изчистване на BM25 кеша в паметта
        clear_bm25_cache(filename)

        return {"message": f"Документът {filename} беше изтрит напълно."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при изтриване: {str(e)}")