"""Static values shared across the bot."""

from __future__ import annotations

from typing import Final

# The three emojis the now-playing embed draws with. Unicode, so they render in any
# deployment - the legacy bot's were custom emojis belonging to its own Discord application,
# which no other application can render.

EMOJI_RESUME_PLAYER: Final = "▶️"
EMOJI_PAUSE_PLAYER: Final = "⏸️"
EMOJI_RADIO_BUTTON: Final = "🔘"
