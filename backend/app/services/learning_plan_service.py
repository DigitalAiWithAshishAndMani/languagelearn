"""
Personalized learning plan generator.
Reads the user's SkillScore data, identifies weak topics, and calls the LLM
to produce a structured roadmap with resources and exercises.
"""
import json
import re
import logging
from sqlalchemy.orm import Session

from app.services import crud
from app.services.tool_calling_agent import llm_client
from app.core.config import settings

logger = logging.getLogger(__name__)

WEAK_SCORE_THRESHOLD = 60.0  # Topics below this get prioritized

# Curated fallback resources per language/topic
RESOURCE_LIBRARY = {
    "python": {
        "oop": [
            {"title": "Python OOP — Real Python", "url": "https://realpython.com/python3-object-oriented-programming/", "type": "tutorial"},
            {"title": "Python Docs: Classes", "url": "https://docs.python.org/3/tutorial/classes.html", "type": "doc"},
        ],
        "generators": [
            {"title": "Python Generators — Real Python", "url": "https://realpython.com/introduction-to-python-generators/", "type": "tutorial"},
        ],
        "decorators": [
            {"title": "Primer on Python Decorators", "url": "https://realpython.com/primer-on-python-decorators/", "type": "tutorial"},
        ],
        "asyncio": [
            {"title": "Asyncio — Python Docs", "url": "https://docs.python.org/3/library/asyncio.html", "type": "doc"},
            {"title": "Async IO in Python: A Complete Walkthrough", "url": "https://realpython.com/async-io-python/", "type": "tutorial"},
        ],
        "data_structures": [
            {"title": "Python Data Structures", "url": "https://docs.python.org/3/tutorial/datastructures.html", "type": "doc"},
        ],
    },
    "javascript": {
        "closures": [
            {"title": "MDN: Closures", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures", "type": "doc"},
        ],
        "promises": [
            {"title": "MDN: Using Promises", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises", "type": "doc"},
        ],
        "async_await": [
            {"title": "javascript.info: Async/Await", "url": "https://javascript.info/async-await", "type": "tutorial"},
        ],
        "prototypes": [
            {"title": "MDN: Inheritance and the Prototype Chain", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain", "type": "doc"},
        ],
    },
    "java": {
        "oop": [{"title": "Baeldung: Java OOP", "url": "https://www.baeldung.com/java-oop", "type": "tutorial"}],
        "collections": [{"title": "Baeldung: Java Collections", "url": "https://www.baeldung.com/java-collections", "type": "tutorial"}],
        "streams": [{"title": "Baeldung: Java 8 Streams", "url": "https://www.baeldung.com/java-8-streams", "type": "tutorial"}],
        "concurrency": [{"title": "Baeldung: Java Concurrency", "url": "https://www.baeldung.com/java-concurrency", "type": "tutorial"}],
    },
    "cpp": {
        "smart_pointers": [{"title": "cppreference: Memory Management", "url": "https://en.cppreference.com/w/cpp/memory", "type": "doc"}],
        "templates": [{"title": "cppreference: Templates", "url": "https://en.cppreference.com/w/cpp/language/templates", "type": "doc"}],
        "stl": [{"title": "cppreference: STL Containers", "url": "https://en.cppreference.com/w/cpp/container", "type": "doc"}],
    },
}


async def generate_learning_plan(user_id: int, db: Session) -> list:
    """
    Generate a personalized learning roadmap for the user.
    Returns a list of roadmap items sorted by priority.
    """
    scores = crud.get_user_skill_scores(db, user_id)
    if not scores:
        # New user — return a starter plan
        return _starter_plan()

    # Identify weak topics
    weak = [s for s in scores if s.proficiency_score < WEAK_SCORE_THRESHOLD]
    weak.sort(key=lambda s: s.proficiency_score)  # worst first

    if not weak:
        # All topics strong — focus on the weakest of the strong ones
        weak = sorted(scores, key=lambda s: s.proficiency_score)[:3]

    # Build context for LLM
    skill_summary = {
        f"{s.language}/{s.topic}": s.proficiency_score for s in scores
    }

    prompt = (
        "You are a programming tutor building a personalized learning plan.\n\n"
        f"User's skill scores: {json.dumps(skill_summary, indent=2)}\n\n"
        "The weakest topics (highest priority):\n"
        + "\n".join(f"  - {s.language}/{s.topic}: {s.proficiency_score}/100" for s in weak[:5])
        + "\n\nFor each weak topic, generate:\n"
        "- A 2-sentence explanation of WHY this topic is important\n"
        "- 3 specific exercises to practice\n\n"
        "Respond ONLY with a valid JSON array:\n"
        "[\n"
        "  {\n"
        '    "language": "python",\n'
        '    "topic": "generators",\n'
        '    "why_important": "...",\n'
        '    "exercises": ["exercise1", "exercise2", "exercise3"]\n'
        "  }\n"
        "]"
    )

    try:
        response = await llm_client.chat.completions.create(
            model=settings.LOCAL_MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a programming education expert."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        raw = response.choices[0].message.content or "[]"
        json_match = re.search(r"\[.*\]", raw, re.DOTALL)
        llm_items = json.loads(json_match.group() if json_match else raw)
    except Exception as e:
        logger.error(f"LLM learning plan generation failed: {e}")
        llm_items = []

    # Build final roadmap items, injecting curated resources
    roadmap = []
    for priority, item in enumerate(llm_items, start=1):
        lang = item.get("language", "")
        topic = item.get("topic", "")
        current_score = next(
            (s.proficiency_score for s in weak if s.language == lang and s.topic == topic),
            50.0,
        )
        resources = RESOURCE_LIBRARY.get(lang, {}).get(topic, [])

        roadmap.append({
            "topic": topic,
            "language": lang,
            "priority": priority,
            "current_score": current_score,
            "why_important": item.get("why_important", ""),
            "resources": resources,
            "exercises": item.get("exercises", []),
        })

    # For topics LLM didn't cover, fill in with library resources
    for i, s in enumerate(weak):
        if not any(r["topic"] == s.topic and r["language"] == s.language for r in roadmap):
            resources = RESOURCE_LIBRARY.get(s.language, {}).get(s.topic, [])
            if resources:
                roadmap.append({
                    "topic": s.topic,
                    "language": s.language,
                    "priority": len(roadmap) + 1,
                    "current_score": s.proficiency_score,
                    "why_important": "",
                    "resources": resources,
                    "exercises": [],
                })

    return roadmap


def _starter_plan() -> list:
    """Default roadmap for brand new users."""
    return [
        {
            "topic": "oop",
            "language": "python",
            "priority": 1,
            "current_score": 0.0,
            "why_important": "OOP is foundational to writing maintainable, scalable Python code.",
            "resources": RESOURCE_LIBRARY["python"]["oop"],
            "exercises": [
                "Implement a Bank Account class with deposit and withdraw methods",
                "Create an Animal class hierarchy with polymorphism",
                "Build a simple inventory system using OOP principles",
            ],
        },
        {
            "topic": "data_structures",
            "language": "python",
            "priority": 2,
            "current_score": 0.0,
            "why_important": "Mastery of built-in data structures unlocks efficient algorithm design.",
            "resources": RESOURCE_LIBRARY["python"]["data_structures"],
            "exercises": [
                "Implement a stack using a Python list",
                "Write a function that finds duplicates in a list in O(n)",
                "Use a dictionary to count word frequencies in a text",
            ],
        },
    ]
