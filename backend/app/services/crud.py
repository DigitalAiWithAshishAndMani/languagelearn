"""
CRUD helpers for all database models.
Route handlers should stay thin — all DB logic lives here.
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.session import InterviewSession
from app.models.submission import Submission
from app.models.skill_score import SkillScore
from app.models.question_history import QuestionHistory
from app.models.learning_plan import LearningPlan


# ── Users ──────────────────────────────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, name: str, email: str, hashed_password: str) -> User:
    user = User(name=name, email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Sessions ───────────────────────────────────────────────────────────────────

def create_session(db: Session, user_id: int, language: str, difficulty: str) -> InterviewSession:
    session = InterviewSession(user_id=user_id, language=language, difficulty=difficulty)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: int) -> Optional[InterviewSession]:
    return db.query(InterviewSession).filter(InterviewSession.id == session_id).first()


def get_user_sessions(db: Session, user_id: int) -> List[InterviewSession]:
    return (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.start_time.desc())
        .all()
    )


def end_session(db: Session, session: InterviewSession) -> InterviewSession:
    from datetime import datetime, timezone
    session.is_active = False
    session.end_time = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


# ── Submissions ────────────────────────────────────────────────────────────────

def create_submission(
    db: Session,
    session_id: int,
    question_id: Optional[int],
    question_text: str,
    question_topic: str,
    question_type: str,
    user_answer: str,
    score: float,
    feedback: dict,
) -> Submission:
    submission = Submission(
        session_id=session_id,
        question_id=question_id,
        question_text=question_text,
        question_topic=question_topic,
        question_type=question_type,
        user_answer=user_answer,
        score=score,
        feedback=feedback,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def get_session_submissions(db: Session, session_id: int) -> List[Submission]:
    return (
        db.query(Submission)
        .filter(Submission.session_id == session_id)
        .order_by(Submission.submitted_at.asc())
        .all()
    )


# ── Skill Scores ───────────────────────────────────────────────────────────────

def get_user_skill_scores(db: Session, user_id: int) -> List[SkillScore]:
    return db.query(SkillScore).filter(SkillScore.user_id == user_id).all()


def get_skill_score(db: Session, user_id: int, language: str, topic: str) -> Optional[SkillScore]:
    return (
        db.query(SkillScore)
        .filter(
            SkillScore.user_id == user_id,
            SkillScore.language == language,
            SkillScore.topic == topic,
        )
        .first()
    )


def upsert_skill_score(
    db: Session, user_id: int, language: str, topic: str, new_score: float
) -> SkillScore:
    """
    Weighted moving average: new_score = 0.7 * old + 0.3 * submission_score
    On first encounter, starts at submission score.
    """
    skill = get_skill_score(db, user_id, language, topic)
    if skill is None:
        skill = SkillScore(
            user_id=user_id, language=language, topic=topic, proficiency_score=new_score
        )
        db.add(skill)
    else:
        skill.proficiency_score = round(0.7 * skill.proficiency_score + 0.3 * new_score, 2)
    db.commit()
    db.refresh(skill)
    return skill


# ── Question History ───────────────────────────────────────────────────────────

def add_question_history(
    db: Session,
    user_id: int,
    language: str,
    topic: Optional[str],
    question_id: Optional[int] = None,
    question_hash: Optional[str] = None,
) -> QuestionHistory:
    entry = QuestionHistory(
        user_id=user_id,
        language=language,
        topic=topic,
        question_id=question_id,
        question_hash=question_hash,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_seen_question_hashes(db: Session, user_id: int, language: str) -> List[str]:
    rows = (
        db.query(QuestionHistory.question_hash)
        .filter(
            QuestionHistory.user_id == user_id,
            QuestionHistory.language == language,
            QuestionHistory.question_hash.isnot(None),
        )
        .all()
    )
    return [r[0] for r in rows]


def get_seen_topics(db: Session, user_id: int, language: str) -> List[str]:
    rows = (
        db.query(QuestionHistory.topic)
        .filter(
            QuestionHistory.user_id == user_id,
            QuestionHistory.language == language,
            QuestionHistory.topic.isnot(None),
        )
        .distinct()
        .all()
    )
    return [r[0] for r in rows]


# ── Learning Plans ─────────────────────────────────────────────────────────────

def get_latest_learning_plan(db: Session, user_id: int) -> Optional[LearningPlan]:
    return (
        db.query(LearningPlan)
        .filter(LearningPlan.user_id == user_id)
        .order_by(LearningPlan.generated_at.desc())
        .first()
    )


def create_learning_plan(db: Session, user_id: int, roadmap: list) -> LearningPlan:
    plan = LearningPlan(user_id=user_id, roadmap=roadmap)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


# ── Analytics ──────────────────────────────────────────────────────────────────

def get_user_analytics(db: Session, user_id: int) -> dict:
    sessions = get_user_sessions(db, user_id)
    session_ids = [s.id for s in sessions]

    all_submissions: List[Submission] = []
    if session_ids:
        all_submissions = (
            db.query(Submission)
            .filter(Submission.session_id.in_(session_ids))
            .all()
        )

    total = len(all_submissions)
    scored = [s for s in all_submissions if s.score is not None]
    accuracy = round(sum(s.score for s in scored) / len(scored), 2) if scored else 0.0

    session_history = []
    for sess in sessions:
        subs = [s for s in all_submissions if s.session_id == sess.id]
        avg = round(sum(s.score for s in subs if s.score) / len(subs), 2) if subs else 0.0
        session_history.append({
            "session_id": sess.id,
            "language": sess.language,
            "difficulty": sess.difficulty,
            "start_time": sess.start_time.isoformat() if sess.start_time else None,
            "questions_answered": len(subs),
            "average_score": avg,
        })

    return {
        "total_questions_solved": total,
        "accuracy_percentage": accuracy,
        "total_sessions": len(sessions),
        "session_history": session_history,
    }
