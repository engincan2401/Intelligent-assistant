from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    question: str

class SourceDocument(BaseModel):
    content: str
    page: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceDocument]