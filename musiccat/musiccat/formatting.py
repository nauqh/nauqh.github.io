"""Helpers that turn player state into the strings shown in embeds."""

from __future__ import annotations

from typing import TYPE_CHECKING
from typing import Literal

from musiccat.constants import EMOJI_PAUSE_PLAYER
from musiccat.constants import EMOJI_RADIO_BUTTON
from musiccat.constants import EMOJI_RESUME_PLAYER

if TYPE_CHECKING:
    import lavalink

PROGRESS_BAR_WIDTH = 12


def parse_time(milliseconds: int) -> tuple[int, int, int, int]:
    """Split a duration in milliseconds into whole days, hours, minutes and seconds."""
    seconds = int(milliseconds) // 1000
    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    return days, hours, minutes, seconds


def format_time(milliseconds: int, unit: Literal["d", "h", "m"] | None = None) -> str:
    """
    Format a duration, using the largest unit that the duration actually needs.

    Args:
        milliseconds: The duration to format.
        unit: Force the largest unit to use, instead of picking it from the duration.
    """
    days, hours, minutes, seconds = parse_time(milliseconds)

    if days and unit in ("d", None):
        return f"{days}:{hours:02}:{minutes:02}:{seconds:02}"
    if (hours or days) and unit in ("d", "h", None):
        return f"{days * 24 + hours}:{minutes:02}:{seconds:02}"
    return f"{(days * 24 + hours) * 60 + minutes}:{seconds:02}"


def progress_bar(fraction: float) -> str:
    """Render a playback progress bar, with the marker placed at ``fraction`` of the way along."""
    marker = min(int(max(fraction, 0.0) * PROGRESS_BAR_WIDTH), PROGRESS_BAR_WIDTH - 1)
    return "".join(EMOJI_RADIO_BUTTON if i == marker else "▬" for i in range(PROGRESS_BAR_WIDTH))


def player_bar(player: lavalink.DefaultPlayer) -> str:
    """Render the play/pause state, progress bar and elapsed time for the current track."""
    current = player.current
    if current is None:
        return ""

    play_pause = EMOJI_RESUME_PLAYER if player.paused else EMOJI_PAUSE_PLAYER

    if current.is_stream or not current.duration:
        return f"{play_pause} {progress_bar(0.99)} `LIVE`"

    playtime = f"{format_time(player.position)} | {format_time(current.duration)}"
    return f"{play_pause} {progress_bar(player.position / current.duration)} `{playtime}`"


def track_length(track: lavalink.AudioTrack) -> str:
    """Format a track's length, or ``LIVE`` for streams."""
    return "LIVE" if track.is_stream else format_time(track.duration)


def trim(text: str, max_len: int) -> str:
    """Shorten ``text`` to ``max_len`` characters, ending with an ellipsis if it was cut."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."
