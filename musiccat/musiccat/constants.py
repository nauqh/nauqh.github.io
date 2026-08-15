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

# Player emojis.
#
# Unicode, so they work in any deployment. The legacy bot used custom emojis whose IDs
# belonged to its own Discord application - another application cannot render them, so a fork
# got blank or rejected buttons with nothing in the logs to explain it.
#
# To use your own: upload them as Application Emojis in the Discord developer portal and
# replace the values below with their mention strings, e.g. "<:mc_pause:1187705962358902806>".
# `musiccat.ui` parses whatever is here, so both forms work.

EMOJI_RESUME_PLAYER: Final = "▶️"
EMOJI_PAUSE_PLAYER: Final = "⏸️"
EMOJI_STOP_PLAYER: Final = "⏹️"
EMOJI_PLAY_PREVIOUS: Final = "⏮️"
EMOJI_PLAY_NEXT: Final = "⏭️"
EMOJI_RADIO_BUTTON: Final = "🔘"
EMOJI_LOOP_OFF: Final = "➡️"
EMOJI_LOOP_TRACK: Final = "🔂"
EMOJI_LOOP_QUEUE: Final = "🔁"
EMOJI_SHUFFLE: Final = "🔀"
