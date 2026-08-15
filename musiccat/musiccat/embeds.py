"""Builders for the embeds MusicCat posts."""

from __future__ import annotations

import hikari
import lavalink

from musiccat import sources
from musiccat.formatting import player_bar
from musiccat.formatting import track_length
from musiccat.player import MusicCatPlayer
from musiccat.player import get_playlist


def track_line(track: lavalink.AudioTrack, *, credit_author: bool = True) -> str:
    """One line describing a track: its linked title, and its length."""
    line = f"[{track.title}]({track.uri}) `{track_length(track)}`"
    if credit_author and track.source_name in sources.CREDITED_SOURCE_NAMES:
        line += f" {track.author}"
    return line


def track_summary(track: lavalink.AudioTrack) -> str:
    """The multi-line summary used when a track is queued, or shown on the player message."""
    return f"[{track.title}]({track.uri})\n{track.author} `{track_length(track)}`\n\n<@!{track.requester}>"


def now_playing(player: MusicCatPlayer) -> hikari.Embed:
    """The embed on the interactive player message."""
    current = player.current
    if current is None:
        return hikari.Embed(description="Nothing is playing.")

    return hikari.Embed(description=track_summary(current)).set_thumbnail(current.artwork_url)


def queue(player: MusicCatPlayer, *, title: str, preview_length: int = 0) -> hikari.Embed:
    """
    The embed behind ``/queue``: the current track, then a numbered list of what follows.

    Args:
        player: The player to describe.
        title: The embed title.
        preview_length: How many queued tracks to list.
    """
    current = player.current
    if current is None:
        return hikari.Embed(title=title, description="Nothing is playing.")

    description = f"[{current.title}]({current.uri})\n{current.author}\n{player_bar(player)}\n\n"

    playlist = get_playlist(current)
    if playlist is not None:
        description += f"Playlist [{playlist.name}]({playlist.url or '#'})\n"

    description += f"Requested <@!{current.requester}>\n"

    upcoming = list(player.queue[: max(preview_length, 0)])
    if upcoming:
        description += "\n**Up next:**"
        for i, track in enumerate(upcoming, start=1):
            description += f"\n{i}. " + track_line(track)

    return hikari.Embed(title=title, description=description).set_thumbnail(current.artwork_url)
