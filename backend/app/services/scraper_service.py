"""
Documentation scraper service.

Fetches and chunks official programming documentation on first run.
Output: backend/data/knowledge_chunks.json

Scrape targets:
  - Python: docs.python.org
  - Java:   docs.oracle.com/javase
  - C++:    cppreference.com
  - JS:     developer.mozilla.org
"""
import json
import re
import logging
from pathlib import Path
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
CHUNKS_FILE = DATA_DIR / "knowledge_chunks.json"
MAX_CHUNK_TOKENS = 400   # approximate; 1 token ≈ 4 chars
CHUNK_OVERLAP = 50       # chars overlap between chunks

# ── Scrape Targets ────────────────────────────────────────────────────────────

SCRAPE_TARGETS = [
    # Python — docs.python.org
    {"language": "python", "topic": "oop", "difficulty": "intermediate",
     "url": "https://docs.python.org/3/tutorial/classes.html"},
    {"language": "python", "topic": "generators", "difficulty": "intermediate",
     "url": "https://docs.python.org/3/howto/functional.html"},
    {"language": "python", "topic": "decorators", "difficulty": "intermediate",
     "url": "https://docs.python.org/3/glossary.html#term-decorator"},
    {"language": "python", "topic": "asyncio", "difficulty": "advanced",
     "url": "https://docs.python.org/3/library/asyncio-task.html"},
    {"language": "python", "topic": "data_structures", "difficulty": "beginner",
     "url": "https://docs.python.org/3/tutorial/datastructures.html"},
    {"language": "python", "topic": "typing", "difficulty": "intermediate",
     "url": "https://docs.python.org/3/library/typing.html"},

    # JavaScript — MDN
    {"language": "javascript", "topic": "closures", "difficulty": "intermediate",
     "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures"},
    {"language": "javascript", "topic": "promises", "difficulty": "intermediate",
     "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises"},
    {"language": "javascript", "topic": "async_await", "difficulty": "intermediate",
     "url": "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises"},
    {"language": "javascript", "topic": "prototypes", "difficulty": "advanced",
     "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain"},
    {"language": "javascript", "topic": "event_loop", "difficulty": "advanced",
     "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop"},

    # Java — MDN/Wikipedia fallback; Oracle requires JS rendering so we use Baeldung
    {"language": "java", "topic": "oop", "difficulty": "beginner",
     "url": "https://www.baeldung.com/java-oop"},
    {"language": "java", "topic": "collections", "difficulty": "intermediate",
     "url": "https://www.baeldung.com/java-collections"},
    {"language": "java", "topic": "streams", "difficulty": "intermediate",
     "url": "https://www.baeldung.com/java-8-streams"},
    {"language": "java", "topic": "concurrency", "difficulty": "advanced",
     "url": "https://www.baeldung.com/java-concurrency"},
    {"language": "java", "topic": "generics", "difficulty": "intermediate",
     "url": "https://www.baeldung.com/java-generics"},

    # C++ — cppreference (static HTML)
    {"language": "cpp", "topic": "smart_pointers", "difficulty": "intermediate",
     "url": "https://en.cppreference.com/w/cpp/memory"},
    {"language": "cpp", "topic": "templates", "difficulty": "advanced",
     "url": "https://en.cppreference.com/w/cpp/language/templates"},
    {"language": "cpp", "topic": "stl", "difficulty": "intermediate",
     "url": "https://en.cppreference.com/w/cpp/container"},
    {"language": "cpp", "topic": "raii", "difficulty": "intermediate",
     "url": "https://en.cppreference.com/w/cpp/language/raii"},
    {"language": "cpp", "topic": "move_semantics", "difficulty": "advanced",
     "url": "https://en.cppreference.com/w/cpp/language/move_constructor"},
]


def _clean_text(text: str) -> str:
    """Strip excess whitespace and non-printable characters."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\x20-\x7E\n]", "", text)
    return text.strip()


def _chunk_text(text: str, max_chars: int = MAX_CHUNK_TOKENS * 4) -> list[str]:
    """Split text into overlapping chunks by sentence boundaries."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) <= max_chars:
            current += " " + sentence
        else:
            if current.strip():
                chunks.append(current.strip())
            # Start next chunk with overlap
            current = current[-CHUNK_OVERLAP * 4:] + " " + sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks


async def _fetch_page(url: str, timeout: int = 15) -> Optional[str]:
    """Fetch a URL and extract readable text via BeautifulSoup."""
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (educational bot)"},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    # Remove noise elements
    for tag in soup(["nav", "header", "footer", "script", "style", "aside", ".sidebar", "#sidebar"]):
        tag.decompose()

    # Try to grab the main content area
    main = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id="content")
        or soup.find(class_="content")
        or soup.find("div", class_=re.compile(r"(content|main|body)", re.I))
        or soup.body
    )

    if main is None:
        return None

    return _clean_text(main.get_text(separator=" "))


async def scrape_and_build_chunks() -> list[dict]:
    """
    Scrape all configured documentation URLs and return a flat list of chunks.
    Each chunk: {id, language, topic, difficulty, source_url, content}
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    all_chunks = []
    chunk_id = 0

    for target in SCRAPE_TARGETS:
        logger.info(f"Scraping: {target['url']}")
        text = await _fetch_page(target["url"])
        if not text:
            logger.warning(f"  → Skipped (no content)")
            continue

        chunks = _chunk_text(text)
        logger.info(f"  → {len(chunks)} chunks extracted")

        for chunk_text in chunks:
            if len(chunk_text) < 80:  # Skip trivially short chunks
                continue
            all_chunks.append({
                "id": chunk_id,
                "language": target["language"],
                "topic": target["topic"],
                "difficulty": target["difficulty"],
                "source_url": target["url"],
                "content": chunk_text,
            })
            chunk_id += 1

    # Persist to disk
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    logger.info(f"Saved {len(all_chunks)} chunks to {CHUNKS_FILE}")
    return all_chunks


def load_chunks() -> list[dict]:
    """Load previously scraped chunks from disk."""
    if not CHUNKS_FILE.exists():
        return []
    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def chunks_exist() -> bool:
    return CHUNKS_FILE.exists() and CHUNKS_FILE.stat().st_size > 100
