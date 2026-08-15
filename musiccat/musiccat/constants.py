"""Static values shared across the bot - audio effects and the custom emoji set."""

from __future__ import annotations

from typing import Final

# Audio effects. Bands are (index, gain) pairs as accepted by lavalink's Equalizer filter.

EQ_BASS_BOOST: Final = (
    (0, 0.2),
    (1, 0.15),
    (2, 0.1),
    (3, 0.05),
    (4, 0.0),
    (5, -0.05),
    (6, -0.1),
    (7, -0.1),
    (8, -0.1),
    (9, -0.1),
    (10, -0.1),
    (11, -0.1),
    (12, -0.1),
    (13, -0.1),
    (14, -0.1),
)

EQ_NIGHTCORE: Final = (
    (0, -0.075),
    (1, 0.125),
    (2, 0.125),
)

TIMESCALE_NIGHTCORE: Final = {"pitch": 0.95, "rate": 1.3, "speed": 1.0}

# The three emojis the now-playing embed draws with. Unicode, so they render in any
# deployment - the legacy bot's were custom emojis belonging to its own Discord application,
# which no other application can render.

EMOJI_RESUME_PLAYER: Final = "▶️"
EMOJI_PAUSE_PLAYER: Final = "⏸️"
EMOJI_RADIO_BUTTON: Final = "🔘"
