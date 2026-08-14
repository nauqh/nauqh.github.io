"""The work behind the commands: connecting to voice, resolving queries and filling the queue."""

from __future__ import annotations

import logging
import random
import re
from typing import Any

import hikari
import lavalink

from musiccat import embeds
from musiccat import errors
from musiccat import sources
from musiccat.player import MusicCatPlayer
from musiccat.player import PlaylistRef
from musiccat.player import set_playlist

LOGGER = logging.getLogger(__name__)

URL_RX = re.compile(r"https?://(?:www\.)?.+")

RICH_PLAYLIST_TYPES = ("artist", "album", "playlist")


def get_player(lavalink_client: lavalink.Client, guild_id: int) -> MusicCatPlayer | None:
    """Return the guild's player, if one exists."""
    player = lavalink_client.player_manager.get(guild_id)
    assert player is None or isinstance(player, MusicCatPlayer)
    return player


def voice_channel_of(bot: hikari.GatewayBot, guild_id: int, user_id: hikari.Snowflakeish) -> int | None:
    """Return the ID of the voice channel a member is in, or `None` if they are not in one."""
    state = bot.cache.get_voice_state(guild_id, user_id)
    return int(state.channel_id) if state is not None and state.channel_id is not None else None


async def join(
    bot: hikari.GatewayBot,
    lavalink_client: lavalink.Client,
    guild_id: int,
    user_id: hikari.Snowflakeish,
) -> tuple[MusicCatPlayer, int]:
    """
    Connect to the voice channel a member is in, creating the guild's player.

    Returns:
        The guild's player, and the ID of the channel joined.

    Raises:
        NotInVoice: If the member is not in a voice channel.
        NoNodesAvailable: If no Lavalink node can host the player.
    """
    channel_id = voice_channel_of(bot, guild_id, user_id)
    if channel_id is None:
        raise errors.NotInVoice

    try:
        player = lavalink_client.player_manager.create(guild_id=guild_id)
    except lavalink.LavalinkError as e:
        LOGGER.error("Failed to create player on guild %s: %s", guild_id, e)
        raise errors.NoNodesAvailable from e

    assert isinstance(player, MusicCatPlayer)

    await bot.update_voice_state(guild_id, channel_id, self_deaf=True)
    LOGGER.info("Connected to voice channel %s on guild %s", channel_id, guild_id)

    return player, channel_id


async def resolve(
    lavalink_client: lavalink.Client,
    query: str,
    source: sources.Source = sources.YOUTUBE,
) -> lavalink.LoadResult:
    """
    Look a query up on Lavalink. Bare queries are searched on ``source``; URLs are loaded as-is.

    Raises:
        NoResults: If the query could not be looked up, or matched nothing.
    """
    query = query.strip().strip("<>")
    if not query:
        raise errors.NoResults

    if not URL_RX.match(query):
        query = source.query(query)

    try:
        result = await lavalink_client.get_tracks(query)
    except lavalink.LavalinkError as e:
        LOGGER.error("Track lookup failed for %r: %s", query, e)
        raise errors.NoResults("Could not reach the audio server - try again in a moment.") from e

    if result.load_type is lavalink.LoadType.ERROR:
        message = result.error.message if result.error is not None else "unknown error"
        LOGGER.warning("Lavalink failed to load %r: %s", query, message)
        raise errors.NoResults(f"Could not load that query: {message}")

    if result.load_type is lavalink.LoadType.EMPTY or not result.tracks:
        raise errors.NoResults

    return result


async def enqueue(
    bot: hikari.GatewayBot,
    lavalink_client: lavalink.Client,
    result: lavalink.LoadResult,
    *,
    guild_id: int,
    requester_id: hikari.Snowflakeish,
    channel_id: hikari.Snowflakeish,
    query: str | None = None,
    play_next: bool = False,
    loop: bool = False,
    shuffle: bool = True,
) -> hikari.Embed:
    """
    Add a load result to the guild's queue, connecting to voice first if needed.

    Args:
        result: What `resolve` returned.
        guild_id: The guild to queue into.
        requester_id: The member who asked for the tracks.
        channel_id: The channel to post the now-playing message in.
        query: The original query, used as the playlist link when the result has no richer one.
        play_next: Queue a single track at the front instead of the back.
        loop: Turn on track looping (single result) or queue looping (playlist).
        shuffle: Shuffle a playlist's tracks as they are queued.

    Returns:
        An embed describing what was added.

    Raises:
        NoResults: If the result holds no tracks.
        NotInVoice: If the bot has to connect, and the requester is not in a voice channel.
    """
    if not result.tracks:
        raise errors.NoResults

    player = get_player(lavalink_client, guild_id)
    if player is None or not player.is_connected:
        player, _ = await join(bot, lavalink_client, guild_id, requester_id)

    player.announce_channel_id = int(channel_id)

    if result.load_type is lavalink.LoadType.PLAYLIST:
        embed = _add_playlist(player, result, requester_id=requester_id, query=query, shuffle=shuffle)
        if loop:
            player.set_loop(player.LOOP_QUEUE)
    else:
        embed = _add_track(player, result.tracks[0], requester_id=requester_id, play_next=play_next)
        if loop:
            player.set_loop(player.LOOP_SINGLE)

    if not player.is_playing:
        await player.play()

    return embed


def _add_track(
    player: MusicCatPlayer,
    track: lavalink.AudioTrack,
    *,
    requester_id: hikari.Snowflakeish,
    play_next: bool,
) -> hikari.Embed:
    player.add(track=track, requester=int(requester_id), index=0 if play_next else None)

    return hikari.Embed(
        title="Track added",
        description=embeds.track_summary(track),
    ).set_thumbnail(track.artwork_url)


def _add_playlist(
    player: MusicCatPlayer,
    result: lavalink.LoadResult,
    *,
    requester_id: hikari.Snowflakeish,
    query: str | None,
    shuffle: bool,
) -> hikari.Embed:
    plugin_info: dict[str, Any] = result.plugin_info or {}
    result_type = plugin_info.get("type") if plugin_info.get("type") in RICH_PLAYLIST_TYPES else "playlist"

    name = result.playlist_info.name or plugin_info.get("author") or "Unknown"
    url = plugin_info.get("url") or (query if query and URL_RX.match(query) else None)
    artwork_url = plugin_info.get("artworkUrl")
    author = plugin_info.get("author")

    tracks = list(result.tracks)
    count = len(tracks)
    playlist = PlaylistRef(name=name, url=url)

    # Shuffling as tracks are queued keeps the shuffle stable, rather than re-rolling every skip.
    while tracks:
        track = tracks.pop(random.randrange(len(tracks)) if shuffle else 0)
        set_playlist(track, playlist)
        player.add(track=track, requester=int(requester_id))

    if result_type == "artist":
        description = f"[{(author or name).upper()}]({url or '#'}) - `{count} tracks`\n\n<@{requester_id}>"
    elif author:
        description = f"[{name}]({url or '#'}) `{count} track(s)`\n{author}\n\n<@{requester_id}>"
    else:
        description = f"Playlist [{name}]({url or '#'}) - {count} tracks\n\n<@{requester_id}>"

    return hikari.Embed(title=f"{result_type.capitalize()} added", description=description).set_thumbnail(artwork_url)
