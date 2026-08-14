"""Joining and leaving voice, and keeping Lavalink informed about voice state."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat import hooks
from musiccat import responses
from musiccat import service

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()


@loader.command
class Join(
    lightbulb.SlashCommand,
    name="join",
    description="Join the voice channel you are in",
    hooks=[hooks.guild_only, hooks.valid_user_voice],
):
    @lightbulb.invoke
    async def invoke(
        self,
        ctx: lightbulb.Context,
        bot: hikari.GatewayBot = lightbulb.di.INJECTED,
        lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
    ) -> None:
        assert ctx.guild_id is not None

        _, channel_id = await service.join(bot, lavalink_client, ctx.guild_id, ctx.user.id)
        await responses.respond(ctx, content=f"Joined <#{channel_id}>")


@loader.command
class Leave(
    lightbulb.SlashCommand,
    name="leave",
    description="Leave the voice channel, clearing the queue",
    hooks=[hooks.guild_only, hooks.valid_user_voice, hooks.player_connected],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, bot: hikari.GatewayBot = lightbulb.di.INJECTED) -> None:
        assert ctx.guild_id is not None

        # Disconnecting fires a voice state update, which stops and clears the player.
        await bot.update_voice_state(ctx.guild_id, None)
        await responses.respond(ctx, content="Left the voice channel!")


@loader.listener(hikari.VoiceServerUpdateEvent)
async def on_voice_server_update(
    event: hikari.VoiceServerUpdateEvent,
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Forward voice server details to Lavalink so it can open its own voice connection."""
    if event.raw_endpoint is None:
        return

    await lavalink_client.voice_update_handler(
        {
            "t": "VOICE_SERVER_UPDATE",
            "d": {
                "guild_id": str(event.guild_id),
                "endpoint": event.raw_endpoint,
                "token": event.token,
            },
        }
    )


@loader.listener(hikari.VoiceStateUpdateEvent)
async def on_voice_state_update(
    event: hikari.VoiceStateUpdateEvent,
    bot: hikari.GatewayBot = lightbulb.di.INJECTED,
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Forward the bot's own voice state to Lavalink, then react to what changed in the channel."""
    state = event.state

    await lavalink_client.voice_update_handler(
        {
            "t": "VOICE_STATE_UPDATE",
            "d": {
                "guild_id": str(state.guild_id),
                "user_id": str(state.user_id),
                "channel_id": str(state.channel_id) if state.channel_id is not None else None,
                "session_id": state.session_id,
            },
        }
    )

    await _react_to_voice_state(bot, lavalink_client, event)


async def _react_to_voice_state(
    bot: hikari.GatewayBot,
    lavalink_client: lavalink.Client,
    event: hikari.VoiceStateUpdateEvent,
) -> None:
    """
    Keep the player in step with who is listening.

    The bot leaves when it is alone, and - when one person is listening - follows their
    deafen/undeafen as pause/resume.
    """
    me = bot.get_me()
    if me is None:
        return

    guild_id = event.guild_id
    player = service.get_player(lavalink_client, guild_id)
    bot_channel_id = service.voice_channel_of(bot, guild_id, me.id)

    if event.state.user_id == me.id:
        if bot_channel_id is None and player is not None:
            LOGGER.info("Disconnected from voice on guild %s", guild_id)
            await player.stop()
        return

    if bot_channel_id is None:
        return

    old_state, new_state = event.old_state, event.state
    left_bot_channel = old_state is not None and old_state.channel_id == bot_channel_id
    in_bot_channel = new_state.channel_id == bot_channel_id
    if not (left_bot_channel or in_bot_channel):
        return

    states = bot.cache.get_voice_states_view_for_guild(guild_id)
    present = [state for state in states.values() if state.channel_id == bot_channel_id]

    if len(present) == 1:  # Just the bot.
        LOGGER.info("Left empty voice channel on guild %s", guild_id)
        await bot.update_voice_state(guild_id, None)
        return

    # Deafen-to-pause only makes sense while a single person is listening.
    if len(present) != 2 or player is None or old_state is None or not in_bot_channel:
        return

    if old_state.is_self_deafened and not new_state.is_self_deafened and player.paused:
        await player.set_pause(False)
        LOGGER.info("Resumed playback on guild %s - listener undeafened", guild_id)
    elif not old_state.is_self_deafened and new_state.is_self_deafened and player.is_playing and not player.paused:
        await player.set_pause(True)
        LOGGER.info("Paused playback on guild %s - listener deafened", guild_id)
