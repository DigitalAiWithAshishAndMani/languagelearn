from pydantic import BaseModel
from typing import Optional, List, Any


class QuestionOut(BaseModel):
    """Question delivered to the frontend for the user to answer."""
    id: str                         # Either DB int (stringified) or "gen_{hash}" for LLM-generated
    language: str
    difficulty: str
    topic: str
    type: str                       # "theory" | "coding"
    content: str
    test_cases: Optional[List[Any]] = None   # Revealed only for coding questions (count only, not expected outputs)


class NextQuestionRequest(BaseModel):
    session_id: int
    language: str
    difficulty: str


class EvaluateAnswerRequest(BaseModel):
    session_id: int
    question_id: str
    question_text: str
    question_type: str              # "theory" | "coding"
    question_topic: str
    language: str
    user_answer: str                # Text answer for theory; source code for coding
    test_cases: Optional[List[Any]] = None


class TestCaseResult(BaseModel):
    stdin: str
    expected_output: str
    actual_output: str
    passed: bool
    execution_time: Optional[str] = None


class EvaluationResult(BaseModel):
    score: float                    # 0–100
    feedback: str
    missed_concepts: List[str] = []
    suggested_topics: List[str] = []
    # Coding-only fields
    passed_tests: Optional[int] = None
    total_tests: Optional[int] = None
    test_results: Optional[List[TestCaseResult]] = None
    optimization_suggestions: Optional[str] = None
