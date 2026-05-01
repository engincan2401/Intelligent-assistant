from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime

# Файлът на базата данни ще се казва chats.db и ще се запази локално
SQLALCHEMY_DATABASE_URL = "sqlite:///./chats.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- МОДЕЛИ НА БАЗАТА ДАННИ ---

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Нов разговор")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Връзка към съобщенията в тази сесия
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String) # "user" или "assistant"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

# Функция за създаване на таблиците
def init_db():
    Base.metadata.create_all(bind=engine)

# Dependency за FastAPI
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()