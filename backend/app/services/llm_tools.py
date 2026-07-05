"""
MCP-style tool definitions and handlers for LLM tool-calling.

The LLM (Qwen / local model) is given these tools as callable functions.
When it decides to call a tool, we execute the handler and inject the
result back into the conversation for the next iteration.
"""
import json
from typing import Any, Optional
from sqlalchemy.orm import Session

from app.services import crud

# ── Tool Schemas (OpenAI function-calling format) ───────────────────────────────

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": (
                "Search the local FAISS vector index for relevant programming knowledge chunks. "
                "Use this to retrieve authoritative context before generating a question or evaluating an answer."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "enum": ["python", "java", "cpp", "javascript"],
                        "description": "Programming language to search within",
                    },
                    "query": {
                        "type": "string",
                        "description": "Semantic search query — describe what knowledge you need",
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["beginner", "intermediate", "advanced"],
                        "description": "Filter chunks by difficulty level (optional)",
                    },
                    "topic": {
                        "type": "string",
                        "description": "Narrow the search to a specific programming topic (optional)",
                    },
                },
                "required": ["language", "query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_skill_profile",
            "description": (
                "Retrieve the user's current proficiency scores per topic. "
                "Use this to understand what the user already knows and tailor question difficulty."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer", "description": "The user's database ID"},
                    "language": {
                        "type": "string",
                        "description": "Filter scores to a specific language (optional)",
                    },
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_question_history",
            "description": (
                "Get a list of topics and question hashes the user has already been asked. "
                "Use this to avoid generating duplicate questions."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer", "description": "The user's database ID"},
                    "language": {
                        "type": "string",
                        "description": "Filter history to a specific programming language",
                    },
                },
                "required": ["user_id", "language"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_code",
            "description": (
                "Execute user-submitted source code against test cases via the Judge0 sandbox. "
                "Use this during coding answer evaluation to get objective test results."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "source_code": {"type": "string", "description": "The code to execute"},
                    "language": {
                        "type": "string",
                        "enum": ["python", "java", "cpp", "javascript"],
                    },
                    "test_cases": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "stdin": {"type": "string"},
                                "expected_output": {"type": "string"},
                            },
                        },
                        "description": "List of test cases to run the code against",
                    },
                },
                "required": ["source_code", "language", "test_cases"],
            },
        },
    },
]


# ── Tool Handlers ───────────────────────────────────────────────────────────────

async def handle_search_knowledge_base(args: dict, faiss_index: Any) -> str:
    """Call FAISS retrieval and return a formatted string of relevant chunks."""
    if faiss_index is None:
        return "Knowledge base is not available. Proceed without retrieved context."

    language = args.get("language", "python")
    query = args.get("query", "")
    difficulty = args.get("difficulty")
    topic = args.get("topic")

    # Import here to avoid circular imports
    from app.services.rag_service import retrieve_chunks
    chunks = retrieve_chunks(
        query=query,
        language=language,
        difficulty=difficulty,
        topic=topic,
        k=5,
    )

    if not chunks:
        return f"No relevant chunks found for query: '{query}'"

    formatted = "\n\n---\n\n".join(
        f"[Source: {c.get('source_url', 'unknown')} | Topic: {c.get('topic', 'unknown')}]\n{c['content']}"
        for c in chunks
    )
    return f"Retrieved {len(chunks)} knowledge chunks:\n\n{formatted}"


async def handle_get_user_skill_profile(args: dict, db: Session) -> str:
    """Return the user's skill scores as a JSON string."""
    user_id = args["user_id"]
    language_filter = args.get("language")

    scores = crud.get_user_skill_scores(db, user_id)
    if language_filter:
        scores = [s for s in scores if s.language == language_filter]

    if not scores:
        return json.dumps({"message": "No skill data yet — user is new", "scores": {}})

    result: dict[str, dict[str, float]] = {}
    for s in scores:
        result.setdefault(s.language, {})[s.topic] = s.proficiency_score

    return json.dumps(result, indent=2)


async def handle_get_question_history(args: dict, db: Session) -> str:
    """Return seen topics and hashes so the LLM avoids repeating them."""
    user_id = args["user_id"]
    language = args["language"]

    seen_topics = crud.get_seen_topics(db, user_id, language)
    seen_hashes = crud.get_seen_question_hashes(db, user_id, language)

    return json.dumps({
        "seen_topics": seen_topics,
        "seen_question_hashes": seen_hashes,
        "total_questions_seen": len(seen_hashes),
    }, indent=2)


async def handle_execute_code(args: dict) -> str:
    """Run code through Judge0 and return results as a JSON string."""
    from app.services.judge0_service import run_test_cases
    source_code = args["source_code"]
    language = args["language"]
    test_cases = args.get("test_cases", [])

    result = await run_test_cases(source_code, language, test_cases)
    return json.dumps(result, indent=2)


# ── Handler Dispatch Map ────────────────────────────────────────────────────────

def build_handler_map(faiss_index: Any, db: Session) -> dict:
    """
    Returns a mapping of tool name → async callable.
    Each handler is a closure capturing the needed resources (db, faiss_index).
    """
    return {
        "search_knowledge_base": lambda args: handle_search_knowledge_base(args, faiss_index),
        "get_user_skill_profile": lambda args: handle_get_user_skill_profile(args, db),
        "get_question_history": lambda args: handle_get_question_history(args, db),
        "execute_code": lambda args: handle_execute_code(args),
    }
