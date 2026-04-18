from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    chat_history: List[Message] = []
    filename: Optional[str] = None
    persona: Optional[str] = "default"


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