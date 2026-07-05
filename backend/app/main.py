from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.database import engine
from app.core.config import settings
import app.models  # noqa: F401 — ensures all models are registered with SQLAlchemy Base
from app.core.database import Base
from app.api import auth, questions, sessions, progress
from app.services.rag_service import init_rag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ────────────────────────────────────────────────────────────────
    logger.info("Creating database tables…")
    Base.metadata.create_all(bind=engine)

    logger.info("Initializing RAG service…")
    try:
        await init_rag()
    except Exception as e:
        logger.error(f"RAG initialization failed (non-fatal): {e}")

    yield  # App runs here

    # ── Shutdown ───────────────────────────────────────────────────────────────
    logger.info("Shutting down.")


app = FastAPI(
    title="Language Learn API",
    description="AI-Powered Programming Interview & Learning Platform with RAG + MCP tool-calling",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:80",    # Nginx production
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(sessions.router)
app.include_router(progress.router)


@app.get("/", tags=["Health"])
async def root():
    return {"message": "Language Learn API", "status": "active", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
