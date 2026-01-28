"""
Centralized Gemini 3 model configuration.

This module provides a single source of truth for all Gemini model references
across the Blueprint application. All API calls should use these constants
instead of hardcoded model names.

Gemini 3 Capabilities Showcased:
- default: General-purpose fast model (Flash)
- reasoning: Advanced reasoning for complex analysis (Pro)
- audio: Audio transcription and processing
- vision: Video and image analysis (NEW - multimodal capability)
- tts: Text-to-speech generation
- live: Real-time conversation streaming
"""

GEMINI_MODELS = {
    "default": "gemini-3-flash-preview",
    "reasoning": "gemini-3-flash-preview",      # For complex grammar/writing analysis
    "audio": "gemini-3-flash-preview",        # Audio transcription
    "vision": "gemini-3-flash-preview",       # NEW - For video/image analysis
    "tts": "gemini-3-flash-preview",      # Text-to-speech
    "live": "gemini-3-flash-preview",    # Real-time conversation
}

# Model selection helpers
def get_model_for_task(task_type: str) -> str:
    """
    Get the appropriate Gemini 3 model for a specific task type.

    Args:
        task_type: One of 'default', 'reasoning', 'audio', 'vision', 'tts', 'live'

    Returns:
        The Gemini 3 model identifier

    Raises:
        ValueError: If task_type is not recognized
    """
    if task_type not in GEMINI_MODELS:
        raise ValueError(
            f"Unknown task type: {task_type}. "
            f"Must be one of {list(GEMINI_MODELS.keys())}"
        )
    return GEMINI_MODELS[task_type]


def get_all_models() -> dict:
    """
    Get all available Gemini 3 models.

    Returns:
        Dictionary of all model configurations
    """
    return GEMINI_MODELS.copy()
