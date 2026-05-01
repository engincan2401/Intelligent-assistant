from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest, FlashcardRequest, FlashcardsResponse, QuizRequest, QuizResponse
from app.services.rag_service import stream_answer, generate_flashcards, generate_quiz
from app.database import get_db_session, ChatSession, ChatMessage

router = APIRouter()


@router.post("/stream")
async def ask_question_stream(request: ChatRequest):
    try:
        return StreamingResponse(
            stream_answer(
                question=request.question, 
                chat_history=request.chat_history, 
                filename=request.filename, 
                persona=request.persona,
                session_id=request.session_id
            ),
            media_type="text/event-stream"
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
    
@router.post("/quiz", response_model=QuizResponse)
async def create_quiz(request: QuizRequest):
    try:
        
        questions = generate_quiz(request.filename) 

        cleaned_questions = []
        
        for q in questions:
            # 1. Проверката започва тук (с 1 таб / 4 интервала навътре)
            if "options" in q and isinstance(q["options"], list):
                
                # 2. Тези два реда трябва да са с 2 таба (8 интервала) навътре!
                valid_options = [opt for opt in q["options"] if isinstance(opt, dict)]
                q["options"] = valid_options[:4] 
                
            # 3. Този ред е извън if-а, но ВЪТРЕ в for цикъла (с 1 таб / 4 интервала навътре)
            cleaned_questions.append(q)

        
        return QuizResponse(questions=cleaned_questions)


    except Exception as e:
        
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/sessions")
def create_session(db: Session = Depends(get_db_session)):
    """Създава нов празен чат"""
    new_session = ChatSession(title="Нов разговор")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return {"id": new_session.id, "title": new_session.title}

@router.get("/sessions")
def get_sessions(db: Session = Depends(get_db_session)):
    """Връща списък с всички предишни разговори"""
    sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()
    return [{"id": s.id, "title": s.title} for s in sessions]

@router.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: int, db: Session = Depends(get_db_session)):
    """Връща всички съобщения за конкретен чат"""
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return [{"role": m.role, "content": m.content} for m in messages]

@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db_session)):
    """Изтрива конкретен чат"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if session:
        db.delete(session)
        db.commit()
    return {"status": "success"}