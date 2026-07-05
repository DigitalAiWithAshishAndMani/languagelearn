"""
RAG (Retrieval-Augmented Generation) service.

Responsibilities:
  1. Build and persist the FAISS vector index from scraped knowledge chunks
  2. Retrieve relevant chunks for a query
  3. Generate interview questions via MCP tool-calling loop
  4. Evaluate theory and coding answers via MCP tool-calling loop
"""
import json
import re
import hashlib
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import faiss
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.scraper_service import scrape_and_build_chunks, load_chunks, chunks_exist

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
INDEX_FILE = DATA_DIR / "faiss_index.bin"
METADATA_FILE = DATA_DIR / "chunk_metadata.json"

# Module-level state (loaded once on startup)
_faiss_index: Optional[faiss.Index] = None
_chunk_metadata: list[dict] = []

embedding_client = AsyncOpenAI(
    base_url=settings.LOCAL_MODEL_BASE_URL,
    api_key=settings.LOCAL_MODEL_API_KEY,
)


# ── Embedding ─────────────────────────────────────────────────────────────────

async def _embed(texts: list[str]) -> np.ndarray:
    """Generate embeddings for a list of texts using the local embedding model."""
    response = await embedding_client.embeddings.create(
        model=settings.LOCAL_EMBEDDING_MODEL_NAME,
        input=texts,
    )
    vectors = [item.embedding for item in response.data]
    return np.array(vectors, dtype="float32")


# ── Index Build ───────────────────────────────────────────────────────────────

async def build_index(chunks: Optional[list[dict]] = None) -> None:
    """
    Build a FAISS flat L2 index from knowledge chunks and persist it.
    If chunks are not provided, loads from disk.
    """
    global _faiss_index, _chunk_metadata

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if chunks is None:
        chunks = load_chunks()

    if not chunks:
        logger.warning("No knowledge chunks available to index.")
        return

    logger.info(f"Building FAISS index from {len(chunks)} chunks…")
    texts = [c["content"] for c in chunks]

    # Embed in batches of 32 to avoid payload limits
    batch_size = 32
    all_vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vecs = await _embed(batch)
        all_vectors.append(vecs)

    matrix = np.vstack(all_vectors)
    dim = matrix.shape[1]

    index = faiss.IndexFlatL2(dim)
    index.add(matrix)

    faiss.write_index(index, str(INDEX_FILE))
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

    _faiss_index = index
    _chunk_metadata = chunks
    logger.info(f"FAISS index built: {index.ntotal} vectors, dim={dim}")


def load_index() -> bool:
    """Load a persisted FAISS index and metadata from disk. Returns True on success."""
    global _faiss_index, _chunk_metadata

    if not INDEX_FILE.exists() or not METADATA_FILE.exists():
        return False

    try:
        _faiss_index = faiss.read_index(str(INDEX_FILE))
        with open(METADATA_FILE, "r", encoding="utf-8") as f:
            _chunk_metadata = json.load(f)
        logger.info(f"Loaded FAISS index: {_faiss_index.ntotal} vectors")
        return True
    except Exception as e:
        logger.error(f"Failed to load FAISS index: {e}")
        return False


def get_index() -> Optional[faiss.Index]:
    return _faiss_index


# ── Retrieval ─────────────────────────────────────────────────────────────────

def retrieve_chunks(
    query: str,
    language: Optional[str] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    k: int = 5,
) -> list[dict]:
    """
    Synchronous retrieval for use inside tool handlers.
    Returns top-k chunks after optional metadata filtering.

    NOTE: This is sync because FAISS search is CPU-bound and near-instant.
    Embedding the query is async — callers from the tool handler use the
    cached query embedding approach (pre-embedded by the agent loop).
    """
    if _faiss_index is None or not _chunk_metadata:
        return []

    # Filter candidate indices by metadata
    candidates = [
        (i, c) for i, c in enumerate(_chunk_metadata)
        if (language is None or c.get("language") == language)
        and (difficulty is None or c.get("difficulty") == difficulty)
        and (topic is None or c.get("topic") == topic)
    ]

    if not candidates:
        return []

    return [c for _, c in candidates[:k]]


async def retrieve_chunks_semantic(
    query: str,
    language: Optional[str] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    k: int = 5,
) -> list[dict]:
    """
    Async semantic retrieval: embeds the query and performs FAISS ANN search,
    then filters by metadata. Used directly by rag_service (not inside a tool handler).
    """
    if _faiss_index is None or not _chunk_metadata:
        return []

    query_vec = await _embed([query])
    distances, indices = _faiss_index.search(query_vec, min(k * 4, _faiss_index.ntotal))

    results = []
    for idx in indices[0]:
        if idx < 0 or idx >= len(_chunk_metadata):
            continue
        chunk = _chunk_metadata[idx]
        if language and chunk.get("language") != language:
            continue
        if difficulty and chunk.get("difficulty") != difficulty:
            continue
        if topic and chunk.get("topic") != topic:
            continue
        results.append(chunk)
        if len(results) >= k:
            break

    return results


# ── Startup Helper ────────────────────────────────────────────────────────────

async def init_rag() -> None:
    """
    Called on FastAPI startup.
    If a FAISS index already exists → load it.
    Otherwise → scrape docs → build index.
    """
    if load_index():
        logger.info("RAG service ready (loaded existing index).")
        return

    logger.info("No existing index found. Scraping documentation…")
    chunks = await scrape_and_build_chunks()
    if chunks:
        await build_index(chunks)
        logger.info("RAG service ready (new index built).")
    else:
        logger.error("Scraping produced no chunks. RAG will be unavailable.")


# ── Question Generation ────────────────────────────────────────────────────────

async def generate_question(
    language: str,
    difficulty: str,
    user_id: int,
    db: Session,
) -> dict:
    """
    Generate an interview question using the MCP tool-calling agent.
    Returns a dict: {question, topic, type, reference_answer, question_hash}
    """
    from app.services.tool_calling_agent import run_tool_calling_agent
    from app.services.llm_tools import TOOLS, build_handler_map

    system_prompt = (
        "You are an expert technical interviewer. Your task is to generate ONE high-quality "
        "programming interview question. Follow this process:\n"
        "1. Call get_question_history to see what the user has already been asked.\n"
        "2. Call get_user_skill_profile to understand their current level.\n"
        "3. Call search_knowledge_base to retrieve relevant technical content.\n"
        "4. Generate a question that is NOT similar to previously asked ones, "
        "is grounded in the retrieved knowledge, and matches the difficulty level.\n\n"
        "Respond ONLY with a valid JSON object in this exact format:\n"
        "{\n"
        '  "question": "<the full question text>",\n'
        '  "topic": "<specific topic>",\n'
        '  "type": "theory",\n'
        '  "reference_answer": "<a complete model answer>"\n'
        "}"
    )

    user_message = (
        f"Generate a {difficulty} {language} interview question for user_id={user_id}. "
        f"The question should test conceptual understanding (theory type)."
    )

    handler_map = build_handler_map(_faiss_index, db)
    raw_response = await run_tool_calling_agent(
        system_prompt=system_prompt,
        user_message=user_message,
        tools=TOOLS,
        handler_map=handler_map,
    )

    # Parse the JSON response
    try:
        # Extract JSON block if LLM wrapped it in markdown
        json_match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(raw_response)
    except (json.JSONDecodeError, AttributeError):
        logger.error(f"Failed to parse question JSON: {raw_response[:200]}")
        result = {
            "question": raw_response,
            "topic": "general",
            "type": "theory",
            "reference_answer": "",
        }

    # Generate a hash to track uniqueness
    question_text = result.get("question", "")
    result["question_hash"] = hashlib.md5(question_text.lower().encode()).hexdigest()
    return result


# ── Theory Answer Evaluation ───────────────────────────────────────────────────

async def evaluate_theory_answer(
    question: str,
    user_answer: str,
    topic: str,
    language: str,
    user_id: int,
    db: Session,
) -> dict:
    """
    Evaluate a theory answer via the MCP tool-calling agent.
    Returns: {score, feedback, missed_concepts, suggested_topics}
    """
    from app.services.tool_calling_agent import run_tool_calling_agent
    from app.services.llm_tools import TOOLS, build_handler_map

    system_prompt = (
        "You are a technical interviewer evaluating a candidate's answer. Follow this process:\n"
        "1. Call search_knowledge_base to retrieve the correct technical knowledge for this question.\n"
        "2. Call get_user_skill_profile to understand the user's background.\n"
        "3. Compare the user's answer to the retrieved knowledge.\n"
        "4. Score it objectively from 0–100 based on correctness, completeness, and clarity.\n\n"
        "Respond ONLY with a valid JSON object:\n"
        "{\n"
        '  "score": <0-100>,\n'
        '  "feedback": "<detailed paragraph feedback>",\n'
        '  "missed_concepts": ["<concept1>", "<concept2>"],\n'
        '  "suggested_topics": ["<topic1>", "<topic2>"]\n'
        "}"
    )

    user_message = (
        f"Question: {question}\n\n"
        f"User's Answer: {user_answer}\n\n"
        f"Context: {language} | Topic: {topic} | user_id={user_id}"
    )

    handler_map = build_handler_map(_faiss_index, db)
    raw = await run_tool_calling_agent(
        system_prompt=system_prompt,
        user_message=user_message,
        tools=TOOLS,
        handler_map=handler_map,
    )

    try:
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        result = json.loads(json_match.group() if json_match else raw)
    except Exception:
        logger.error(f"Failed to parse evaluation JSON: {raw[:200]}")
        result = {
            "score": 50.0,
            "feedback": raw,
            "missed_concepts": [],
            "suggested_topics": [],
        }

    return result


# ── Coding Answer Evaluation ───────────────────────────────────────────────────

async def evaluate_coding_answer(
    question: str,
    user_code: str,
    language: str,
    topic: str,
    test_cases: list,
    user_id: int,
    db: Session,
) -> dict:
    """
    Evaluate a coding answer by running test cases via Judge0 (through the
    execute_code tool) and then generating LLM feedback.
    Returns: {score, passed_tests, total_tests, test_results, feedback, optimization_suggestions}
    """
    from app.services.tool_calling_agent import run_tool_calling_agent
    from app.services.llm_tools import TOOLS, build_handler_map

    system_prompt = (
        "You are a technical interviewer evaluating a coding submission. Follow this process:\n"
        "1. Call execute_code with the user's code and test cases to get objective results.\n"
        "2. Call search_knowledge_base to understand best practices for this topic.\n"
        "3. Analyze: logic correctness, code style, time/space complexity, best practices.\n"
        "4. Calculate score: 60% from test pass rate, 40% from code quality.\n\n"
        "Respond ONLY with a valid JSON object:\n"
        "{\n"
        '  "score": <0-100>,\n'
        '  "passed_tests": <int>,\n'
        '  "total_tests": <int>,\n'
        '  "test_results": [{"stdin":"","expected_output":"","actual_output":"","passed":true}],\n'
        '  "feedback": "<detailed paragraph>",\n'
        '  "optimization_suggestions": "<suggestions for improvement>"\n'
        "}"
    )

    user_message = (
        f"Question: {question}\n\n"
        f"User's Code ({language}):\n```\n{user_code}\n```\n\n"
        f"Topic: {topic} | user_id={user_id}\n"
        f"Test cases to run: {json.dumps(test_cases)}"
    )

    handler_map = build_handler_map(_faiss_index, db)
    raw = await run_tool_calling_agent(
        system_prompt=system_prompt,
        user_message=user_message,
        tools=TOOLS,
        handler_map=handler_map,
    )

    try:
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        result = json.loads(json_match.group() if json_match else raw)
    except Exception:
        logger.error(f"Failed to parse coding evaluation JSON: {raw[:200]}")
        result = {
            "score": 0.0,
            "passed_tests": 0,
            "total_tests": len(test_cases),
            "test_results": [],
            "feedback": raw,
            "optimization_suggestions": "",
        }

    return result
