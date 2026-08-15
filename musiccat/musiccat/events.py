"""Handling of the events Lavalink sends about players and nodes."""

from __future__ import annotations

import logging

import hikari
import lavalink

from musiccat import embeds
from musiccat.player import MusicCatPlayer
from musiccat.player import NowPlayingMessage

LOGGER = logging.getLogger(__name__)
TRACK_LOGGER = logging.getLogger("musiccat.track")


class LavalinkEventHandler:
    """
    Keeps the now-playing message in step with the player.

    Register it with `lavalink.Client.add_event_hooks`.
    """

    def __init__(self, bot: hikari.GatewayBot) -> None:
        self._bot = bot

    @lavalink.listener(lavalink.TrackStartEvent)
    async def on_track_start(self, event: lavalink.TrackStartEvent) -> None:
        player = event.player
        assert isinstance(player, MusicCatPlayer)

        TRACK_LOGGER.info("%s - %s - %s", event.track.title, event.track.author, event.track.uri)
        LOGGER.info("Track started on guild %s", player.guild_id)

        await self.post_now_playing(player)

    @lavalink.listener(lavalink.QueueEndEvent)
    async def on_queue_end(self, event: lavalink.QueueEndEvent) -> None:
        player = event.player
        assert isinstance(player, MusicCatPlayer)

        LOGGER.info("Queue finished on guild %s", player.guild_id)
        await self.clear_now_playing(player)

    @lavalink.listener(lavalink.TrackEndEvent)
    async def on_track_end(self, event: lavalink.TrackEndEvent) -> None:
        LOGGER.debug("Track finished on guild %s (%s)", event.player.guild_id, event.reason)

    @lavalink.listener(lavalink.TrackExceptionEvent)
    async def on_track_exception(self, event: lavalink.TrackExceptionEvent) -> None:
        LOGGER.warning(
            "Track %r failed on guild %s: %s",
            event.track.title,
            event.player.guild_id,
            event.message,
        )

    @lavalink.listener(lavalink.TrackStuckEvent)
    async def on_track_stuck(self, event: lavalink.TrackStuckEvent) -> None:
        LOGGER.warning(
            "Track %r stuck for %sms on guild %s - skipping",
            event.track.title,
            event.threshold,
            event.player.guild_id,
        )
        await event.player.play()

    @lavalink.listener(lavalink.NodeConnectedEvent)
    async def on_node_connected(self, event: lavalink.NodeConnectedEvent) -> None:
        LOGGER.info("Connected to Lavalink node %r", event.node.name)

    @lavalink.listener(lavalink.NodeDisconnectedEvent)
    async def on_node_disconnected(self, event: lavalink.NodeDisconnectedEvent) -> None:
        LOGGER.warning("Disconnected from Lavalink node %r (code %s): %s", event.node.name, event.code, event.reason)

    @lavalink.listener(lavalink.WebSocketClosedEvent)
    async def on_websocket_closed(self, event: lavalink.WebSocketClosedEvent) -> None:
        LOGGER.warning(
            "Voice websocket closed on guild %s (code %s): %s",
            event.player.guild_id,
            event.code,
            event.reason,
        )

    async def post_now_playing(self, player: MusicCatPlayer) -> None:
        """Replace the guild's now-playing message with one describing the current track."""
        await self.clear_now_playing(player)

        if not player.is_playing or player.announce_channel_id is None:
            return

        channel_id = player.announce_channel_id

        try:
            message = await self._bot.rest.create_message(
                channel=channel_id,
                embed=embeds.now_playing(player),
            )
        except hikari.HikariError as e:
            LOGGER.error("Failed to post player message in channel %s: %s", channel_id, e)
            return

        player.now_playing = NowPlayingMessage(channel_id=channel_id, message_id=int(message.id))

    async def clear_now_playing(self, player: MusicCatPlayer) -> None:
        """
        Take down the guild's now-playing message, if there is one.

        Safe to call more than once - the reference is dropped before the message is deleted.
        """
        now_playing, player.now_playing = player.now_playing, None
        if now_playing is None:
            return

        try:
            await self._bot.rest.delete_message(now_playing.channel_id, now_playing.message_id)
        except (hikari.NotFoundError, hikari.ForbiddenError):
            LOGGER.debug("Player message %s was already gone", now_playing.message_id)
        except hikari.HikariError as e:
            LOGGER.error("Failed to delete player message %s: %s", now_playing.message_id, e)
