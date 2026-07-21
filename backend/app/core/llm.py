"""
PlantBrain — Google Gemini LLM Client Wrapper
Uses the new google-genai SDK (google.genai).
"""
from __future__ import annotations
from functools import lru_cache

from google import genai
from google.genai import types
from app.core.config import get_settings


@lru_cache()
def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.gemini_api_key)


_DEFAULT_MODEL = "gemini-2.0-flash"


def call_claude(
    prompt: str,
    system: str = "You are PlantBrain, an expert industrial AI assistant.",
    model: str = _DEFAULT_MODEL,
    max_tokens: int = 2048,
    temperature: float = 0.0,
) -> str:
    """
    Simple blocking call to Gemini (drop-in replacement for call_claude).
    Returns the text response.
    """
    client = _get_client()
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
            temperature=temperature,
        ),
    )
    return response.text


def call_claude_json(
    prompt: str,
    system: str = "You are a precise extraction engine. Always return valid JSON only. Do not include markdown code fences.",
    model: str = _DEFAULT_MODEL,
    max_tokens: int = 1024,
) -> str:
    """
    Gemini call expecting a JSON response.
    Uses JSON mode to ensure valid output.
    """
    client = _get_client()
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=max_tokens,
            temperature=0.0,
            response_mime_type="application/json",
        ),
    )
    return response.text
