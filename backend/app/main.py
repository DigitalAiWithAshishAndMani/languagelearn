from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Language Learn API",
    description="Backend API for Language Learning and Training Application with RAG",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # React + Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Language Learn API",
        "status": "active"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }
