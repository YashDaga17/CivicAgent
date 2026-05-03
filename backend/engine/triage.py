"""
Triage Engine — the agentic core of CivicAgent.

Orchestrates Gemini with function-calling to decide which tools
to invoke, executes them, and synthesises a structured ChatResponse.

Supports two Gemini modes:
  1. API Key mode (google-generativeai) — simplest, uses GOOGLE_API_KEY
  2. Vertex AI mode (google-cloud-aiplatform) — uses service account

When Gemini is unavailable, falls back to a deterministic pipeline.
"""

from __future__ import annotations

import logging
from typing import Any

from config import settings
from models.schemas import ChatRequest, ChatResponse, TimelineStep, UserContext
from tools.location_tool import resolve_location
from tools.rag_tool import retrieve_election_data

logger = logging.getLogger(__name__)


# ── Tool dispatch map ────────────────────────────────────────────────────────

def _dispatch_tool(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Execute a tool by name and return serialisable results."""
    if name == "resolve_location":
        ctx = resolve_location(
            location_hint=args.get("location_hint"),
            query_text=args.get("query_text", ""),
        )
        return ctx.model_dump()

    if name == "retrieve_election_data":
        steps, guidelines = retrieve_election_data(state=args["state"])
        return {
            "steps": [s.model_dump() for s in steps],
            "guidelines": guidelines,
        }

    logger.warning("Unknown tool requested: %s", name)
    return {"error": f"Unknown tool: {name}"}


# ── Gemini via API Key (google-generativeai) ─────────────────────────────────

def _run_with_api_key(request: ChatRequest) -> ChatResponse:
    """Use Gemini via google-generativeai SDK with API key + Google Search grounding."""
    import google.generativeai as genai
    from engine.prompts import SYSTEM_PROMPT, TOOL_DECLARATIONS

    genai.configure(api_key=settings.google_api_key)

    # Build tool declarations: custom tools + Google Search for real-time info
    tools = [
        {"function_declarations": TOOL_DECLARATIONS},
        {"google_search": {}},  # Enable Google Search grounding
    ]

    model = genai.GenerativeModel(
        model_name=settings.gemini_model_name,
        system_instruction=SYSTEM_PROMPT,
        tools=tools,
    )
    chat = model.start_chat()

    user_message = request.query
    if request.location_hint:
        user_message += f"\n(User's location hint: {request.location_hint})"

    response = chat.send_message(user_message)

    # Agentic loop
    user_context: UserContext | None = None
    all_steps: list[TimelineStep] = []
    max_turns = 5

    for _ in range(max_turns):
        # Check for function calls
        function_calls = []
        for part in response.parts:
            if fn := part.function_call:
                function_calls.append(fn)

        if not function_calls:
            break

        # Execute tool calls
        responses = []
        for fc in function_calls:
            tool_name = fc.name
            tool_args = dict(fc.args) if fc.args else {}
            logger.info("Gemini (API key) invoked: %s(%s)", tool_name, tool_args)

            result = _dispatch_tool(tool_name, tool_args)

            if tool_name == "resolve_location" and "error" not in result:
                user_context = UserContext(**result)
            elif tool_name == "retrieve_election_data" and "error" not in result:
                all_steps = [TimelineStep(**s) for s in result.get("steps", [])]

            responses.append(
                genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=tool_name,
                        response={"result": result},
                    )
                )
            )

        response = chat.send_message(
            genai.protos.Content(parts=responses)
        )

    # Extract summary
    summary = response.text if hasattr(response, "text") and response.text else ""

    if user_context is None:
        user_context = resolve_location(
            location_hint=request.location_hint,
            query_text=request.query,
        )
    if not all_steps:
        all_steps, _ = retrieve_election_data(state=user_context.state)

    return ChatResponse(
        user_context=user_context,
        steps=all_steps,
        summary=summary.strip() or _generate_fallback_summary(user_context, all_steps),
    )


# ── Gemini via Vertex AI ─────────────────────────────────────────────────────

def _run_with_vertex(request: ChatRequest) -> ChatResponse:
    """Use Vertex AI Gemini with function-calling."""
    from google.cloud import aiplatform
    from vertexai.generative_models import (
        FunctionDeclaration, GenerativeModel, Part, Tool,
    )
    from engine.prompts import SYSTEM_PROMPT, TOOL_DECLARATIONS

    aiplatform.init(project=settings.gcp_project_id, location=settings.gcp_location)

    func_declarations = [
        FunctionDeclaration(
            name=td["name"],
            description=td["description"],
            parameters=td["parameters"],
        )
        for td in TOOL_DECLARATIONS
    ]
    tools = [Tool(function_declarations=func_declarations)]

    model = GenerativeModel(
        model_name=settings.gemini_model_name,
        system_instruction=SYSTEM_PROMPT,
        tools=tools,
    )
    chat = model.start_chat()

    user_message = request.query
    if request.location_hint:
        user_message += f"\n(User's location hint: {request.location_hint})"

    response = chat.send_message(user_message)

    user_context: UserContext | None = None
    all_steps: list[TimelineStep] = []
    max_turns = 5

    for _ in range(max_turns):
        function_calls = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    function_calls.append(part.function_call)

        if not function_calls:
            break

        function_responses = []
        for fc in function_calls:
            tool_name = fc.name
            tool_args = dict(fc.args) if fc.args else {}
            logger.info("Gemini (Vertex) invoked: %s(%s)", tool_name, tool_args)

            result = _dispatch_tool(tool_name, tool_args)

            if tool_name == "resolve_location" and "error" not in result:
                user_context = UserContext(**result)
            elif tool_name == "retrieve_election_data" and "error" not in result:
                all_steps = [TimelineStep(**s) for s in result.get("steps", [])]

            function_responses.append(
                Part.from_function_response(
                    name=tool_name,
                    response={"result": result},
                )
            )

        response = chat.send_message(function_responses)

    summary = ""
    for candidate in response.candidates:
        for part in candidate.content.parts:
            if hasattr(part, "text") and part.text:
                summary += part.text

    if user_context is None:
        user_context = resolve_location(
            location_hint=request.location_hint,
            query_text=request.query,
        )
    if not all_steps:
        all_steps, _ = retrieve_election_data(state=user_context.state)

    return ChatResponse(
        user_context=user_context,
        steps=all_steps,
        summary=summary.strip() or _generate_fallback_summary(user_context, all_steps),
    )


# ── Deterministic fallback ───────────────────────────────────────────────────

def _generate_fallback_summary(ctx: UserContext, steps: list[TimelineStep]) -> str:
    """Generate a helpful summary without Gemini."""
    status_msg = {
        "first-time": "As a first-time voter, ",
        "returning": "Welcome back! ",
        "unknown": "",
    }.get(ctx.voter_status, "")

    return (
        f"{status_msg}here's your election timeline for {ctx.state}. "
        f"Make sure your name is on the electoral roll — you can register using Form 6 "
        f"on the NVSP portal (voters.eci.gov.in) or the Voter Helpline App. "
        f"Check your state CEO website for the latest updates, or dial 1950 for assistance. "
        f"Your vote is your voice! 🗳️"
    )


def _run_fallback(request: ChatRequest) -> ChatResponse:
    """Deterministic pipeline when Gemini is unavailable."""
    logger.info("Running in fallback/mock mode")
    user_context = resolve_location(
        location_hint=request.location_hint,
        query_text=request.query,
    )
    steps, _ = retrieve_election_data(state=user_context.state)
    return ChatResponse(
        user_context=user_context,
        steps=steps,
        summary=_generate_fallback_summary(user_context, steps),
    )


# ── Public API ───────────────────────────────────────────────────────────────

async def process_query(request: ChatRequest) -> ChatResponse:
    """
    Main entry point. Routes through Gemini (API key or Vertex)
    when available, otherwise falls back to deterministic pipeline.
    """
    if settings.use_mock_mode:
        return _run_fallback(request)

    # Check if any Gemini credentials are configured
    if not settings.has_gemini_credentials:
        logger.warning("No Gemini credentials configured — using fallback pipeline")
        return _run_fallback(request)

    # Prefer API key mode (simpler), then Vertex AI
    try:
        if settings.google_api_key:
            logger.info("Using Gemini via API key")
            return _run_with_api_key(request)
        else:
            logger.info("Using Gemini via Vertex AI (project=%s)", settings.gcp_project_id)
            return _run_with_vertex(request)
    except Exception as exc:
        logger.error("Gemini triage failed, using fallback: %s", exc)
        return _run_fallback(request)

