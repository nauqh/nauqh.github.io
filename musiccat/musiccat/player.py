"""MusicCat's Lavalink player - a `lavalink.DefaultPlayer` with history and a now-playing message."""

from __future__ import annotations

import asyncio
import dataclasses
import logging

import lavalink

LOGGER = logging.getLogger(__name__)


PLAYLIST_KEY = "musiccat.playlist"


@dataclasses.dataclass(frozen=True, slots=True)
class PlaylistRef:
    """Where a queued track came from, so ``/queue`` can credit the playlist it belongs to."""

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
    """The now-playing message currently posted for a guild."""

    channel_id: int
    message_id: int


class MusicCatPlayer(lavalink.DefaultPlayer):
    """
    Adds to the default player a handle on the guild's now-playing message, so the message can
    be replaced when the track changes, and a `stop` that resets rather than merely stopping.
    """

    def __init__(self, guild_id: int, node: lavalink.Node) -> None:
        super().__init__(guild_id, node)

        self.now_playing: NowPlayingMessage | None = None
        self.announce_channel_id: int | None = None
        """The channel to post the next now-playing message in - the channel the last command came from."""

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
        self.loop = self.LOOP_NONE
        self.shuffle = False
        self.announce_channel_id = None

        # Tells the event handler to take down the now-playing message. `DefaultPlayer.play`
        # dispatches this too when it runs out of queue, so handling must stay idempotent.
        self.client._dispatch_event(lavalink.QueueEndEvent(self))
