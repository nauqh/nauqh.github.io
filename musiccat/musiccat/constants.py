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

# Custom emojis. These are mention strings so they render inside embed descriptions;
# `musiccat.ui` parses them into `hikari.CustomEmoji` where a button needs one.

EMOJI_RESUME_PLAYER: Final = "<:mc_resume:1187705966263812218>"
EMOJI_PAUSE_PLAYER: Final = "<:mc_pause:1187705962358902806>"
EMOJI_STOP_PLAYER: Final = "<:mc_stop:1187705975638081557>"
EMOJI_PLAY_PREVIOUS: Final = "<:mc_previous:1187705971070488627>"
EMOJI_PLAY_NEXT: Final = "<:mc_next:1187705968331591710>"
EMOJI_RADIO_BUTTON: Final = "<:mc_radio_button:1187818871072247858>"
EMOJI_LOOP_OFF: Final = "<:mc_loop_off:1189020553353371678>"
EMOJI_LOOP_TRACK: Final = "<:mc_loop_track:1189020551340114032>"
EMOJI_LOOP_QUEUE: Final = "<:mc_loop_queue:1189020548525735956>"
EMOJI_SHUFFLE_OFF: Final = "<:mc_shuffle_off:1189022239354531890>"
EMOJI_SHUFFLE_ON: Final = "<:mc_shuffle_on:1189022235621605498>"
