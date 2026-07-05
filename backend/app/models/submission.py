from sqlalchemy import Column, Integer, String, Text, JSON, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="SET NULL"), nullable=True, index=True)
    # For LLM-generated questions not stored in the DB, store the question text directly
    question_text = Column(Text, nullable=True)
    question_topic = Column(String, nullable=True)
    question_type = Column(String, nullable=True)               # theory | coding
    user_answer = Column(Text, nullable=False)
    score = Column(Float, nullable=True)                        # 0-100
    feedback = Column(JSON, nullable=True)                      # {feedback, missed_concepts, suggested_topics, ...}
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
