from app.models.schemas import ChatRequest, FlashcardRequest, FlashcardsResponse
from app.services.rag_service import stream_answer, generate_flashcards
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.rag_service import stream_answer

router = APIRouter()

@router.post("/stream")
async def ask_question_stream(request: ChatRequest):
    try:
        return StreamingResponse(
            stream_answer(
                request.question, 
                request.chat_history, 
                request.filename,
                request.persona 
            ),
            media_type="text/plain"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/flashcards", response_model=FlashcardsResponse)
async def create_flashcards(request: FlashcardRequest):
    try:
        cards = generate_flashcards(request.filename)
        return FlashcardsResponse(flashcards=cards)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))