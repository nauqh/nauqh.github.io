"""Controlling what is already playing."""

from __future__ import annotations

import logging
import re

import hikari
import lavalink
import lightbulb

from musiccat import errors
from musiccat import hooks
from musiccat import responses
from musiccat import service
from musiccat.constants import EQ_BASS_BOOST
from musiccat.constants import EQ_NIGHTCORE
from musiccat.constants import TIMESCALE_NIGHTCORE
from musiccat.player import MusicCatPlayer

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()

POSITION_RX = re.compile(r"^(?:(\d+):)?([0-5]?\d):([0-5]\d)$")

EFFECT_NONE = "None"
EFFECT_BASS_BOOST = "Bass Boost"
EFFECT_NIGHTCORE = "Nightcore"


def require_player(lavalink_client: lavalink.Client, ctx: lightbulb.Context) -> MusicCatPlayer:
    """Fetch the guild's player. The command hooks have already checked that there is one."""
    assert ctx.guild_id is not None

    player = service.get_player(lavalink_client, ctx.guild_id)
    if player is None:
        raise errors.PlayerNotConnected
    return player


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


@loader.command
class Seek(
    lightbulb.SlashCommand,
    name="seek",
    description="Seek to a position in the current track",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_playing],
):
    position = lightbulb.string("position", 'Where to seek to, as "mm:ss" or "hh:mm:ss"')

    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        player = require_player(lavalink_client, ctx)
        if player.current is None or not player.current.is_seekable:
            raise errors.TrackNotSeekable

        milliseconds = _parse_position(self.position)
        if milliseconds is None:
            raise errors.MusicCatError(f"`{self.position}` is not a position - try `1:23` or `1:02:03`.")

        if player.current.duration and milliseconds >= player.current.duration:
            raise errors.MusicCatError("That position is past the end of the track.")

        await player.seek(milliseconds)
        await responses.respond(ctx, embed=hikari.Embed(description=f"⏩ Moved to `{self.position}`"))


@loader.command
class Effects(
    lightbulb.SlashCommand,
    name="effects",
    description="Apply an audio effect to the player",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_playing],
):
    effect = lightbulb.string(
        "effect",
        "The effect to apply",
        choices=[lightbulb.Choice(name, name) for name in (EFFECT_BASS_BOOST, EFFECT_NIGHTCORE, EFFECT_NONE)],
    )

    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        player = require_player(lavalink_client, ctx)

        if self.effect == EFFECT_NONE:
            await player.clear_filters()
            await responses.respond(ctx, embed=hikari.Embed(description="Effects cleared"))
            return

        # `replace=True` swaps one effect for another, rather than stacking them.
        await player.set_filters(*_filters(self.effect), replace=True)
        await responses.respond(ctx, embed=hikari.Embed(description=f"Effect applied: `{self.effect}`"))
        LOGGER.info("Applied effect %r on guild %s", self.effect, ctx.guild_id)


def _filters(effect: str) -> tuple[lavalink.Filter, ...]:
    equalizer = lavalink.Equalizer()

    if effect == EFFECT_BASS_BOOST:
        equalizer.update(bands=EQ_BASS_BOOST)
        return (equalizer,)

    equalizer.update(bands=EQ_NIGHTCORE)
    timescale = lavalink.Timescale()
    timescale.update(**TIMESCALE_NIGHTCORE)
    return (equalizer, timescale)


def _parse_position(position: str) -> int | None:
    """Parse ``mm:ss`` or ``hh:mm:ss`` into milliseconds, or `None` if it is neither."""
    match = POSITION_RX.match(position.strip())
    if match is None:
        return None

    hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return ((hours * 60 + minutes) * 60 + seconds) * 1000
