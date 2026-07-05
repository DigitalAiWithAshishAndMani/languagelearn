from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class SkillScoreOut(BaseModel):
    language: str
    topic: str
    proficiency_score: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProgressSummary(BaseModel):
    total_questions_solved: int
    accuracy_percentage: float
    skill_scores: List[SkillScoreOut]
    # Grouped for easy frontend consumption: {"python": {"oop": 80, "generators": 45}}
    skill_map: Dict[str, Dict[str, float]]


class AnalyticsOut(BaseModel):
    total_questions_solved: int
    accuracy_percentage: float
    total_sessions: int
    # Per-session history for charts
    session_history: List[Dict[str, Any]]


class ResourceOut(BaseModel):
    title: str
    url: str
    type: str   # "doc" | "video" | "exercise" | "tutorial"


class RoadmapItemOut(BaseModel):
    topic: str
    language: str
    priority: int           # 1 = highest priority
    current_score: float
    resources: List[ResourceOut]
    exercises: List[str]


class LearningPlanOut(BaseModel):
    id: int
    generated_at: datetime
    weak_topics: List[str]
    roadmap: List[RoadmapItemOut]

    model_config = {"from_attributes": True}
