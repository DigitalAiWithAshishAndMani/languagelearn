from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionCreate(BaseModel):
    language: str
    difficulty: str


class SubmissionSummary(BaseModel):
    id: int
    question_text: Optional[str]
    question_topic: Optional[str]
    question_type: Optional[str]
    score: Optional[float]
    submitted_at: datetime

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: int
    user_id: int
    language: str
    difficulty: str
    start_time: datetime
    end_time: Optional[datetime]
    is_active: bool

    model_config = {"from_attributes": True}


class SessionSummary(BaseModel):
    session: SessionOut
    submissions: List[SubmissionSummary]
    total_questions: int
    average_score: Optional[float]
