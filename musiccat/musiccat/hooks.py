"""Command checks, as lightbulb execution hooks.

Each hook raises a `musiccat.errors.MusicCatError`; the client's error handler turns that into
an ephemeral reply.
"""

from __future__ import annotations

import hikari
import lavalink
import lightbulb

from musiccat import errors
from musiccat import service


@lightbulb.hook(lightbulb.ExecutionSteps.CHECKS)
def guild_only(_: lightbulb.ExecutionPipeline, ctx: lightbulb.Context) -> None:
    """Reject the command unless it was invoked in a guild."""
    if ctx.guild_id is None:
        raise errors.GuildOnly


@lightbulb.hook(lightbulb.ExecutionSteps.CHECKS)
def valid_user_voice(
    _: lightbulb.ExecutionPipeline,
    ctx: lightbulb.Context,
    bot: hikari.GatewayBot = lightbulb.di.INJECTED,
) -> None:
    """Require the caller to be in a voice channel, and in the bot's channel if the bot is in one."""
    if ctx.guild_id is None:
        raise errors.GuildOnly

    me = bot.get_me()
    user_channel_id = service.voice_channel_of(bot, ctx.guild_id, ctx.user.id)
    bot_channel_id = service.voice_channel_of(bot, ctx.guild_id, me.id) if me is not None else None

    if user_channel_id is None:
        raise errors.NotInVoice
    if bot_channel_id is not None and user_channel_id != bot_channel_id:
        raise errors.NotSameVoice


@lightbulb.hook(lightbulb.ExecutionSteps.CHECKS)
def player_connected(
    _: lightbulb.ExecutionPipeline,
    ctx: lightbulb.Context,
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Require a player that is connected to voice."""
    if ctx.guild_id is None:
        raise errors.GuildOnly

    player = service.get_player(lavalink_client, ctx.guild_id)
    if player is None or not player.is_connected:
        raise errors.PlayerNotConnected


@lightbulb.hook(lightbulb.ExecutionSteps.CHECKS)
def player_playing(
    _: lightbulb.ExecutionPipeline,
    ctx: lightbulb.Context,
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Require a player with a track loaded."""
    if ctx.guild_id is None:
        raise errors.GuildOnly

    player = service.get_player(lavalink_client, ctx.guild_id)
    if player is None or not player.is_playing:
        raise errors.PlayerNotPlaying
