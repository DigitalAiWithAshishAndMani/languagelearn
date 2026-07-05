from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.question import QuestionOut, EvaluateAnswerRequest, EvaluationResult
from app.services.auth_service import get_current_user
from app.services import crud, rag_service

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("/next", response_model=QuestionOut)
async def get_next_question(
    session_id: int = Query(...),
    language: str = Query(...),
    difficulty: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return the next interview question for the active session."""
    # Validate session belongs to this user
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not session.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session has ended")

    if language not in ("python", "java", "cpp", "javascript"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported language")
    if difficulty not in ("beginner", "intermediate", "advanced"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid difficulty")

    question_data = await rag_service.generate_question(
        language=language,
        difficulty=difficulty,
        user_id=current_user.id,
        db=db,
    )

    # Record in question history to prevent future repeats
    crud.add_question_history(
        db,
        user_id=current_user.id,
        language=language,
        topic=question_data.get("topic"),
        question_hash=question_data.get("question_hash"),
    )

    return QuestionOut(
        id=f"gen_{question_data['question_hash']}",
        language=language,
        difficulty=difficulty,
        topic=question_data.get("topic", "general"),
        type=question_data.get("type", "theory"),
        content=question_data.get("question", ""),
    )


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate_answer(
    payload: EvaluateAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluate a user's answer (theory or coding) and update their skill scores."""
    session = crud.get_session(db, payload.session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if payload.question_type == "theory":
        result = await rag_service.evaluate_theory_answer(
            question=payload.question_text,
            user_answer=payload.user_answer,
            topic=payload.question_topic,
            language=payload.language,
            user_id=current_user.id,
            db=db,
        )
        evaluation = EvaluationResult(
            score=result.get("score", 0),
            feedback=result.get("feedback", ""),
            missed_concepts=result.get("missed_concepts", []),
            suggested_topics=result.get("suggested_topics", []),
        )

    elif payload.question_type == "coding":
        result = await rag_service.evaluate_coding_answer(
            question=payload.question_text,
            user_code=payload.user_answer,
            language=payload.language,
            topic=payload.question_topic,
            test_cases=payload.test_cases or [],
            user_id=current_user.id,
            db=db,
        )
        evaluation = EvaluationResult(
            score=result.get("score", 0),
            feedback=result.get("feedback", ""),
            missed_concepts=result.get("missed_concepts", []),
            suggested_topics=result.get("suggested_topics", []),
            passed_tests=result.get("passed_tests"),
            total_tests=result.get("total_tests"),
            test_results=result.get("test_results"),
            optimization_suggestions=result.get("optimization_suggestions"),
        )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid question type")

    # Persist the submission
    crud.create_submission(
        db=db,
        session_id=payload.session_id,
        question_id=None,
        question_text=payload.question_text,
        question_topic=payload.question_topic,
        question_type=payload.question_type,
        user_answer=payload.user_answer,
        score=evaluation.score,
        feedback=evaluation.model_dump(),
    )

    # Update skill score for this topic
    crud.upsert_skill_score(
        db=db,
        user_id=current_user.id,
        language=payload.language,
        topic=payload.question_topic,
        new_score=evaluation.score,
    )

    return evaluation
