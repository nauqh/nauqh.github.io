"""Controlling what is already playing."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat import errors
from musiccat import hooks
from musiccat import responses
from musiccat import service
from musiccat.player import MusicCatPlayer

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()


def require_player(lavalink_client: lavalink.Client, ctx: lightbulb.Context) -> MusicCatPlayer:
    """Fetch the guild's player. The command hooks have already checked that there is one."""
    assert ctx.guild_id is not None

    player = service.get_player(lavalink_client, ctx.guild_id)
    if player is None:
        raise errors.PlayerNotConnected
    return player


@loader.command
class Pause(
    lightbulb.SlashCommand,
    name="pause",
    description="Pause playback, or resume it if already paused",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_playing],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        player = require_player(lavalink_client, ctx)

        # One toggling command rather than a /pause and a /resume: there are no player buttons,
        # so this is the only way to pause, and a pair would be two commands for one idea.
        await player.set_pause(not player.paused)

        description = "⏸️ Paused" if player.paused else "▶️ Resumed"
        await responses.respond(ctx, embed=hikari.Embed(description=description))


@loader.command
class Skip(
    lightbulb.SlashCommand,
    name="skip",
    description="Skip the current track",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_playing],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        player = require_player(lavalink_client, ctx)
        skipped = await player.skip()

        description = (
            f"⏭️ Skipped: [{skipped.title}]({skipped.uri})" if skipped is not None else "⏭️ Skipped the current track"
        )
        await responses.respond(ctx, embed=hikari.Embed(description=description))
