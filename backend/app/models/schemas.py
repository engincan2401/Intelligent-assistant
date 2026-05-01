from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class QuizOption(BaseModel):
    text: str
    is_correct: bool

class QuizQuestion(BaseModel):
    question: str
    options: List[QuizOption]
    explanation: str

class QuizRequest(BaseModel):
    filename: str
    num_questions: int = 5

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    chat_history: List[Dict[str, Any]] = []
    filename: Optional[str] = "all"
    persona: str = "default"
    session_id: Optional[int] = None


class DocumentInfo(BaseModel):
    filename: str
    pages: int
    chunks: int


class Source(BaseModel):
    content: str
    page: int


class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]

class FlashcardRequest(BaseModel):
    filename: str

class Flashcard(BaseModel):
    question: str
    answer: str

class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard]