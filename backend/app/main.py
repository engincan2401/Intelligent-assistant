from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.documents import router as documents_router
import uvicorn


app = FastAPI(
    title="Intelligent assistant",
    description="Backend",
    version="1.0.0"
)

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])

@app.get("/api/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "message": "Backend работи"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)