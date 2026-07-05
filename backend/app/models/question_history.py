from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class QuestionHistory(Base):
    """
    Tracks which questions (by topic + content hash) have been shown to each user.
    Prevents repeating questions across sessions.
    """
    __tablename__ = "question_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=True)
    # For LLM-generated questions, store a content hash to detect near-duplicates
    question_hash = Column(String, nullable=True, index=True)
    language = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    seen_at = Column(DateTime(timezone=True), server_default=func.now())
