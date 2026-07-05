from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User
from app.schemas.session import SessionCreate, SessionOut, SessionSummary, SubmissionSummary
from app.services.auth_service import get_current_user
from app.services import crud

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("/start", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def start_session(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new interview session for the authenticated user."""
    if payload.language not in ("python", "java", "cpp", "javascript"):
        raise HTTPException(status_code=400, detail="Unsupported language")
    if payload.difficulty not in ("beginner", "intermediate", "advanced"):
        raise HTTPException(status_code=400, detail="Invalid difficulty")

    session = crud.create_session(db, current_user.id, payload.language, payload.difficulty)
    return session


@router.get("", response_model=List[SessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all past sessions for the current user."""
    return crud.get_user_sessions(db, current_user.id)


@router.get("/{session_id}", response_model=SessionSummary)
def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a session with all its submissions and aggregate stats."""
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    submissions = crud.get_session_submissions(db, session_id)
    scored = [s for s in submissions if s.score is not None]
    avg_score = round(sum(s.score for s in scored) / len(scored), 2) if scored else None

    return SessionSummary(
        session=session,
        submissions=[SubmissionSummary.model_validate(s) for s in submissions],
        total_questions=len(submissions),
        average_score=avg_score,
    )


@router.post("/{session_id}/end", response_model=SessionOut)
def end_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """End an active interview session."""
    session = crud.get_session(db, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if not session.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is already ended")

    return crud.end_session(db, session)
