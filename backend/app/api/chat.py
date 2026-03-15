from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, SourceDocument
from app.services.rag_service import generate_answer

router =APIRouter()

@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest):

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Въпросът не може да бъде празен.")
    try:
        answer, source_docs = generate_answer(request.question)

        formatted_sources= [
            SourceDocument(
                content=doc.page_content,
                page=doc.metadata.get("page", 0)
            )
            for doc in source_docs
        ]

        return ChatResponse(answer=answer, sources=formatted_sources)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Грешка при генериране на отговор: {str(e)}")
    