"""MusicCat's Lavalink player - a `lavalink.DefaultPlayer` with history and a now-playing message."""

from __future__ import annotations

import asyncio
import dataclasses
import logging
from typing import Any

import lavalink
from lavalink.common import MISSING

LOGGER = logging.getLogger(__name__)

HISTORY_LIMIT = 50
"""How many played tracks to remember, for the sake of the "previous track" button."""

REWIND_THRESHOLD_MS = 5000
"""Past this point in a track, "previous" restarts the track instead of going back one."""

PLAYLIST_KEY = "musiccat.playlist"


@dataclasses.dataclass(frozen=True, slots=True)
class PlaylistRef:
    """Where a queued track came from, so ``/now`` can credit the playlist it belongs to."""

    name: str
    url: str | None = None


def set_playlist(track: lavalink.AudioTrack, playlist: PlaylistRef) -> None:
    """Tag a track with the playlist it was loaded from."""
    track.extra[PLAYLIST_KEY] = playlist


def get_playlist(track: lavalink.AudioTrack) -> PlaylistRef | None:
    """Return the playlist a track was loaded from, if it was loaded from one."""
    playlist = track.extra.get(PLAYLIST_KEY)
    return playlist if isinstance(playlist, PlaylistRef) else None


@dataclasses.dataclass(slots=True)
class NowPlayingMessage:
    """The interactive player message currently posted for a guild."""

    channel_id: int
    message_id: int
    menu_task: asyncio.Task[None]
    """The task running the message's component menu. Cancelling it detaches the menu."""

    def detach_menu(self) -> None:
        """Stop listening for presses on this message's buttons."""
        self.menu_task.cancel()


class MusicCatPlayer(lavalink.DefaultPlayer):
    """
    Adds to the default player:

    * a history of played tracks, so the player can step backwards;
    * the ability to play a specific queue index, bypassing shuffle;
    * a handle on the guild's now-playing message, so it can be replaced when the track changes.
    """

    def __init__(self, guild_id: int, node: lavalink.Node) -> None:
        super().__init__(guild_id, node)

        self.history: list[lavalink.AudioTrack] = []
        self.now_playing: NowPlayingMessage | None = None
        self.announce_channel_id: int | None = None
        """The channel to post the next now-playing message in - the channel the last command came from."""

    def remember(self, track: lavalink.AudioTrack) -> None:
        """Record a track as played. Called when Lavalink reports that the track started."""
        self.history.append(track)
        if len(self.history) > HISTORY_LIMIT:
            del self.history[: len(self.history) - HISTORY_LIMIT]

    async def play(
        self,
        track: lavalink.AudioTrack | lavalink.DeferredAudioTrack | dict[str, Any] | None = None,
        start_time: int = MISSING,
        end_time: int = MISSING,
        no_replace: bool = MISSING,
        volume: int = MISSING,
        pause: bool = MISSING,
        *,
        index: int | None = None,
        **kwargs: Any,
    ) -> None:
        """
        Play a track, the queue's next track, or - with ``index`` - a specific track from the queue.

        Args:
            index: The queue index to play, bypassing shuffle. Mutually exclusive with ``track``.

        Raises:
            ValueError: If both ``track`` and ``index`` were given, or ``index`` is out of range.
        """
        if index is not None:
            if track is not None:
                raise ValueError("'track' and 'index' cannot both be specified")
            if not 0 <= index < len(self.queue):
                raise ValueError(f"'index' must be within the queue (0-{len(self.queue) - 1}), got {index}")
            track = self.queue.pop(index)

        await super().play(track, start_time, end_time, no_replace, volume, pause, **kwargs)

    async def play_previous(self) -> None:
        """
        Restart the current track, or - if it only just started - go back to the previous one.

        The track that was playing is put back at the front of the queue, so "previous" then
        "next" returns to where you were.
        """
        current = self.current
        if current is not None and current.is_seekable and self.position > REWIND_THRESHOLD_MS:
            await self.seek(0)
            return

        # history[-1] is the current track, so stepping back needs the two most recent entries.
        if len(self.history) < 2:
            await self.seek(0)
            return

        self.queue[:0] = self.history[-2:]
        del self.history[-2:]

        # Loop modes re-queue `current` whenever a track is played explicitly, which would
        # duplicate the track that was just pushed back onto the queue.
        loop = self.loop
        self.loop = self.LOOP_NONE
        try:
            await self.play(index=0)
        finally:
            self.loop = loop

    async def skip(self) -> lavalink.AudioTrack | None:
        """Play the next track, returning the one that was skipped."""
        skipped = self.current
        await self.play()
        return skipped

    def remove(self, index: int) -> lavalink.AudioTrack:
        """
        Remove a track from the queue by index.

        Raises:
            IndexError: If there is no track at that index.
        """
        return self.queue.pop(index)

    async def stop(self) -> None:
        """
        Stop playback and reset the player: queue, history, loop, shuffle and filters.

        Local state is reset even when the node cannot be reached - this also runs when the bot
        has been disconnected from voice, which is exactly when the node may already be gone.
        """
        try:
            await super().stop()
            await self.clear_filters()
        except (lavalink.LavalinkError, OSError, asyncio.TimeoutError) as e:
            LOGGER.warning("Failed to stop player on guild %s cleanly: %s", self.guild_id, e)
            self.current = None

        self.queue.clear()
        self.history.clear()
        self.loop = self.LOOP_NONE
        self.shuffle = False
        self.announce_channel_id = None

        # Tells the event handler to take down the now-playing message. `DefaultPlayer.play`
        # dispatches this too when it runs out of queue, so handling must stay idempotent.
        self.client._dispatch_event(lavalink.QueueEndEvent(self))
