"""Inspecting and editing the queue."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat import embeds
from musiccat import errors
from musiccat import hooks
from musiccat import responses
from musiccat import service
from musiccat.formatting import trim

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()

QUEUE_PREVIEW_LENGTH = 10
MAX_CHOICES = 25


@loader.command
class Now(
    lightbulb.SlashCommand,
    name="now",
    description="Show what is playing",
    hooks=[hooks.guild_only, hooks.player_playing],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        assert ctx.guild_id is not None

        player = service.get_player(lavalink_client, ctx.guild_id)
        if player is None:
            raise errors.PlayerNotPlaying

        await ctx.respond(embed=embeds.queue(player, title="🎵 Now Playing", preview_length=1))


@loader.command
class Queue(
    lightbulb.SlashCommand,
    name="queue",
    description="Show the next tracks in the queue",
    hooks=[hooks.guild_only, hooks.player_playing],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        assert ctx.guild_id is not None

        player = service.get_player(lavalink_client, ctx.guild_id)
        if player is None:
            raise errors.PlayerNotPlaying

        await ctx.respond(embed=embeds.queue(player, title="🎵 Queue", preview_length=QUEUE_PREVIEW_LENGTH))


@lightbulb.di.with_di
async def track_autocomplete(
    ctx: lightbulb.AutocompleteContext[int],
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Offer the queued tracks, so ``/remove`` can be pointed at one by index."""
    guild_id = ctx.interaction.guild_id
    player = service.get_player(lavalink_client, guild_id) if guild_id is not None else None

    if player is None or not player.queue:
        await ctx.respond([])
        return

    await ctx.respond(
        [
            hikari.impl.AutocompleteChoiceBuilder(
                name=trim(f"{i + 1}. {trim(track.title, 60)} - {trim(track.author, 20)}", 100),
                value=i,
            )
            for i, track in enumerate(player.queue[:MAX_CHOICES])
        ]
    )


@loader.command
class Remove(
    lightbulb.SlashCommand,
    name="remove",
    description="Remove a track from the queue",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_playing],
):
    track = lightbulb.integer("track", "The track to remove", autocomplete=track_autocomplete, min_value=0)

    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        assert ctx.guild_id is not None

        player = service.get_player(lavalink_client, ctx.guild_id)
        if player is None:
            raise errors.PlayerNotPlaying

        try:
            removed = player.remove(self.track)
        except IndexError:
            raise errors.MusicCatError("There is no track at that position in the queue.") from None

        await responses.respond(
            ctx,
            embed=hikari.Embed(description=f"Removed: [{removed.title}]({removed.uri})"),
        )
