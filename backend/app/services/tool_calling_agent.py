"""
Agentic tool-calling loop — the core MCP execution engine.

The LLM is run in a loop:
  1. Send messages + tool definitions
  2. If the model returns tool_calls → execute the handler, append result, repeat
  3. If the model returns plain text → that is the final answer

Falls back to a simple single-shot prompt if ENABLE_TOOL_CALLING is False
(useful for models that don't support function calling).
"""
import json
import logging
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared async OpenAI-compatible client (pointed at local LLM server)
llm_client = AsyncOpenAI(
    base_url=settings.LOCAL_MODEL_BASE_URL,
    api_key=settings.LOCAL_MODEL_API_KEY,
)


async def run_tool_calling_agent(
    system_prompt: str,
    user_message: str,
    tools: list[dict],
    handler_map: dict[str, Any],
    max_iterations: int | None = None,
) -> str:
    """
    Run the LLM in an agentic loop with tool-calling support.

    Args:
        system_prompt: Instructions for how the LLM should behave.
        user_message: The initial user-facing message / task.
        tools: List of tool schemas in OpenAI function-calling format.
        handler_map: Dict mapping tool name → async callable(args) → str.
        max_iterations: Override the config default max iterations.

    Returns:
        The LLM's final text response (after all tool calls are resolved).
    """
    if max_iterations is None:
        max_iterations = settings.MAX_TOOL_ITERATIONS

    # If tool-calling is disabled, fall through to simple completion
    if not settings.ENABLE_TOOL_CALLING:
        return await _simple_completion(system_prompt, user_message)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    for iteration in range(max_iterations):
        try:
            response = await llm_client.chat.completions.create(
                model=settings.LOCAL_MODEL_NAME,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.3,
            )
        except Exception as e:
            logger.warning(f"Tool-calling failed (iteration {iteration}): {e}. Falling back.")
            return await _simple_completion(system_prompt, user_message)

        choice = response.choices[0]
        message = choice.message

        # No tool calls → LLM is done
        if not message.tool_calls:
            return message.content or ""

        # Append assistant's tool-call message
        messages.append({
            "role": "assistant",
            "content": message.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in message.tool_calls
            ],
        })

        # Execute each tool call and append results
        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            try:
                args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                args = {}

            handler = handler_map.get(tool_name)
            if handler is None:
                tool_result = json.dumps({"error": f"Unknown tool: {tool_name}"})
            else:
                try:
                    tool_result = await handler(args)
                except Exception as exc:
                    logger.error(f"Tool '{tool_name}' raised: {exc}")
                    tool_result = json.dumps({"error": str(exc)})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

        logger.debug(f"Tool-calling iteration {iteration + 1}/{max_iterations} complete")

    # Max iterations reached — do a final completion without tools
    logger.warning("Max tool-calling iterations reached. Requesting final answer.")
    messages.append({
        "role": "user",
        "content": "Please provide your final answer now based on the information gathered.",
    })
    final = await llm_client.chat.completions.create(
        model=settings.LOCAL_MODEL_NAME,
        messages=messages,
        temperature=0.3,
    )
    return final.choices[0].message.content or ""


async def _simple_completion(system_prompt: str, user_message: str) -> str:
    """Fallback: single-shot completion without tool-calling."""
    response = await llm_client.chat.completions.create(
        model=settings.LOCAL_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content or ""
