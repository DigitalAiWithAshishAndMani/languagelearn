from sqlalchemy import Column, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Structured roadmap: list of {topic, priority, resources: [{title, url, type}], exercises: [...]}
    roadmap = Column(JSON, nullable=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
