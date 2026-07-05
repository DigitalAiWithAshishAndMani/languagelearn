from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.schemas.progress import SkillScoreOut, ProgressSummary, LearningPlanOut, AnalyticsOut, RoadmapItemOut, ResourceOut
from app.services.auth_service import get_current_user
from app.services import crud
from app.services.learning_plan_service import generate_learning_plan

router = APIRouter(prefix="/progress", tags=["Progress & Learning"])


@router.get("", response_model=ProgressSummary)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's topic-wise proficiency scores, grouped by language."""
    scores = crud.get_user_skill_scores(db, current_user.id)

    skill_map: dict[str, dict[str, float]] = {}
    for s in scores:
        skill_map.setdefault(s.language, {})[s.topic] = s.proficiency_score

    analytics = crud.get_user_analytics(db, current_user.id)

    return ProgressSummary(
        total_questions_solved=analytics["total_questions_solved"],
        accuracy_percentage=analytics["accuracy_percentage"],
        skill_scores=[SkillScoreOut.model_validate(s) for s in scores],
        skill_map=skill_map,
    )


@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return detailed analytics: totals, accuracy, and per-session history."""
    analytics = crud.get_user_analytics(db, current_user.id)
    return AnalyticsOut(**analytics)


@router.get("/learning-plan", response_model=LearningPlanOut)
async def get_learning_plan(
    refresh: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the user's personalized learning plan.
    Pass ?refresh=true to regenerate from the latest skill scores.
    """
    # Use cached plan unless refresh is requested
    if not refresh:
        cached = crud.get_latest_learning_plan(db, current_user.id)
        if cached:
            scores = crud.get_user_skill_scores(db, current_user.id)
            weak_topics = [
                f"{s.language}/{s.topic}"
                for s in scores if s.proficiency_score < 60.0
            ]
            roadmap_items = _parse_roadmap(cached.roadmap)
            return LearningPlanOut(
                id=cached.id,
                generated_at=cached.generated_at,
                weak_topics=weak_topics,
                roadmap=roadmap_items,
            )

    # Generate a fresh plan
    roadmap = await generate_learning_plan(current_user.id, db)
    plan = crud.create_learning_plan(db, current_user.id, roadmap)

    scores = crud.get_user_skill_scores(db, current_user.id)
    weak_topics = [
        f"{s.language}/{s.topic}"
        for s in scores if s.proficiency_score < 60.0
    ]

    return LearningPlanOut(
        id=plan.id,
        generated_at=plan.generated_at,
        weak_topics=weak_topics,
        roadmap=_parse_roadmap(roadmap),
    )


def _parse_roadmap(raw: list) -> list[RoadmapItemOut]:
    """Convert raw JSON roadmap list to validated Pydantic models."""
    items = []
    for item in raw:
        resources = [ResourceOut(**r) for r in item.get("resources", [])]
        items.append(RoadmapItemOut(
            topic=item.get("topic", ""),
            language=item.get("language", ""),
            priority=item.get("priority", 99),
            current_score=item.get("current_score", 0.0),
            resources=resources,
            exercises=item.get("exercises", []),
        ))
    return sorted(items, key=lambda x: x.priority)
