"""
Judge0 sandbox integration service.
Submits code for execution and retrieves results.
"""
import asyncio
import httpx
from typing import List, Optional

from app.core.config import settings

# Judge0 language IDs
LANGUAGE_IDS = {
    "python": 71,
    "java": 62,
    "cpp": 54,
    "javascript": 63,
}

# Judge0 status codes
STATUS_ACCEPTED = 3
STATUS_WRONG_ANSWER = 4
STATUS_TIME_LIMIT = 5
STATUS_COMPILE_ERROR = 6
STATUS_RUNTIME_ERROR_SIGSEGV = 11


async def submit_code(
    source_code: str,
    language: str,
    stdin: str = "",
    expected_output: Optional[str] = None,
) -> str:
    """Submit code to Judge0 and return the submission token."""
    language_id = LANGUAGE_IDS.get(language.lower())
    if not language_id:
        raise ValueError(f"Unsupported language: {language}")

    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "stdin": stdin,
    }
    if expected_output is not None:
        payload["expected_output"] = expected_output

    headers = {}
    if settings.JUDGE0_API_KEY:
        headers["X-Auth-Token"] = settings.JUDGE0_API_KEY

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()["token"]


async def get_result(token: str, max_retries: int = 20) -> dict:
    """Poll Judge0 until the submission is no longer processing."""
    headers = {}
    if settings.JUDGE0_API_KEY:
        headers["X-Auth-Token"] = settings.JUDGE0_API_KEY

    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(max_retries):
            resp = await client.get(
                f"{settings.JUDGE0_API_URL}/submissions/{token}?base64_encoded=false",
                headers=headers,
            )
            resp.raise_for_status()
            data = resp.json()
            status_id = data.get("status", {}).get("id", 0)
            # Status IDs 1 (In Queue) and 2 (Processing) — keep polling
            if status_id not in (1, 2):
                return data
            await asyncio.sleep(0.8)
    return {"error": "Timeout waiting for Judge0 result"}


async def run_test_cases(
    source_code: str,
    language: str,
    test_cases: List[dict],
) -> dict:
    """
    Run source code against all test cases concurrently.
    Returns aggregated pass/fail results.
    """
    if not test_cases:
        return {"passed": 0, "total": 0, "results": []}

    # Submit all test cases concurrently
    tokens = await asyncio.gather(
        *[
            submit_code(
                source_code,
                language,
                stdin=tc.get("stdin", ""),
                expected_output=tc.get("expected_output"),
            )
            for tc in test_cases
        ],
        return_exceptions=True,
    )

    results = []
    passed = 0
    for i, (tc, token) in enumerate(zip(test_cases, tokens)):
        if isinstance(token, Exception):
            results.append({
                "stdin": tc.get("stdin", ""),
                "expected_output": tc.get("expected_output", ""),
                "actual_output": "",
                "passed": False,
                "execution_time": None,
                "error": str(token),
            })
            continue

        data = await get_result(token)
        status_id = data.get("status", {}).get("id", 0)
        stdout = (data.get("stdout") or "").strip()
        stderr = data.get("stderr") or data.get("compile_output") or ""
        expected = (tc.get("expected_output") or "").strip()
        case_passed = status_id == STATUS_ACCEPTED or stdout == expected

        if case_passed:
            passed += 1

        results.append({
            "stdin": tc.get("stdin", ""),
            "expected_output": expected,
            "actual_output": stdout or stderr,
            "passed": case_passed,
            "execution_time": data.get("time"),
        })

    return {"passed": passed, "total": len(test_cases), "results": results}
