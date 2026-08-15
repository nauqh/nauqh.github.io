"""The interactive player message - buttons built on lightbulb's component menus."""

from __future__ import annotations

import logging

import hikari
import lightbulb

from musiccat import embeds
from musiccat.constants import EMOJI_LOOP_OFF
from musiccat.constants import EMOJI_LOOP_QUEUE
from musiccat.constants import EMOJI_LOOP_TRACK
from musiccat.constants import EMOJI_PAUSE_PLAYER
from musiccat.constants import EMOJI_PLAY_NEXT
from musiccat.constants import EMOJI_PLAY_PREVIOUS
from musiccat.constants import EMOJI_RESUME_PLAYER
from musiccat.constants import EMOJI_SHUFFLE
from musiccat.constants import EMOJI_STOP_PLAYER
from musiccat.player import MusicCatPlayer

LOGGER = logging.getLogger(__name__)

LOOP_EMOJIS = {
    MusicCatPlayer.LOOP_NONE: EMOJI_LOOP_OFF,
    MusicCatPlayer.LOOP_SINGLE: EMOJI_LOOP_TRACK,
    MusicCatPlayer.LOOP_QUEUE: EMOJI_LOOP_QUEUE,
}
LOOP_CYCLE = (MusicCatPlayer.LOOP_NONE, MusicCatPlayer.LOOP_SINGLE, MusicCatPlayer.LOOP_QUEUE)


def _emoji(mention: str) -> hikari.Emoji:
    """Turn one of the emoji mentions in `musiccat.constants` into an emoji a button can use."""
    return hikari.Emoji.parse(mention)


class PlayerMenu(lightbulb.components.Menu):
    """
    The buttons under the now-playing message.

    A menu is created per now-playing message and attached with no timeout; the event handler
    stops it when it takes the message down.
    """

    def __init__(self, player: MusicCatPlayer, bot: hikari.GatewayBot) -> None:
        self.player = player
        self.bot = bot

        secondary = hikari.ButtonStyle.SECONDARY

        self.previous_button = self.add_interactive_button(
            secondary, self.on_previous, emoji=_emoji(EMOJI_PLAY_PREVIOUS)
        )
        self.pause_button = self.add_interactive_button(secondary, self.on_pause, emoji=self._pause_emoji())
        self.next_button = self.add_interactive_button(secondary, self.on_next, emoji=_emoji(EMOJI_PLAY_NEXT))

        self.next_row()

        self.loop_button = self.add_interactive_button(secondary, self.on_loop, emoji=self._loop_emoji())
        self.shuffle_button = self.add_interactive_button(
            self._shuffle_style(), self.on_shuffle, emoji=_emoji(EMOJI_SHUFFLE)
        )
        self.stop_button = self.add_interactive_button(secondary, self.on_stop, emoji=_emoji(EMOJI_STOP_PLAYER))

    def _pause_emoji(self) -> hikari.Emoji:
        return _emoji(EMOJI_RESUME_PLAYER if self.player.paused else EMOJI_PAUSE_PLAYER)

    def _loop_emoji(self) -> hikari.Emoji:
        return _emoji(LOOP_EMOJIS.get(self.player.loop, EMOJI_LOOP_OFF))

    def _shuffle_style(self) -> hikari.ButtonStyle:
        # One glyph for both states, so the button's colour carries whether shuffle is on.
        return hikari.ButtonStyle.SUCCESS if self.player.shuffle else hikari.ButtonStyle.SECONDARY

    async def predicate(self, ctx: lightbulb.components.MenuContext) -> bool:
        """Only let members sharing the bot's voice channel touch the player."""
        me = self.bot.get_me()
        if ctx.guild_id is None or me is None:
            return False

        bot_state = self.bot.cache.get_voice_state(ctx.guild_id, me.id)
        user_state = self.bot.cache.get_voice_state(ctx.guild_id, ctx.user.id)

        if bot_state is None or user_state is None or user_state.channel_id != bot_state.channel_id:
            await ctx.respond("Join the bot's voice channel to control the player.", ephemeral=True)
            return False

        return True

    async def refresh(self, ctx: lightbulb.components.MenuContext) -> None:
        """Re-send the embed and buttons so they match the player's current state."""
        await ctx.respond(embed=embeds.now_playing(self.player), edit=True, rebuild_menu=True)

    async def on_previous(self, ctx: lightbulb.components.MenuContext) -> None:
        # Stepping tracks replaces this whole message, so acknowledge before the message goes away.
        await ctx.defer(edit=True)
        await self.player.play_previous()

    async def on_next(self, ctx: lightbulb.components.MenuContext) -> None:
        await ctx.defer(edit=True)
        await self.player.skip()

    async def on_stop(self, ctx: lightbulb.components.MenuContext) -> None:
        await ctx.defer(edit=True)
        await self.player.stop()

    async def on_pause(self, ctx: lightbulb.components.MenuContext) -> None:
        await self.player.set_pause(not self.player.paused)
        self.pause_button.emoji = self._pause_emoji()
        await self.refresh(ctx)

    async def on_loop(self, ctx: lightbulb.components.MenuContext) -> None:
        index = LOOP_CYCLE.index(self.player.loop) if self.player.loop in LOOP_CYCLE else 0
        self.player.set_loop(LOOP_CYCLE[(index + 1) % len(LOOP_CYCLE)])
        self.loop_button.emoji = self._loop_emoji()
        await self.refresh(ctx)

    async def on_shuffle(self, ctx: lightbulb.components.MenuContext) -> None:
        self.player.set_shuffle(not self.player.shuffle)
        self.shuffle_button.style = self._shuffle_style()
        await self.refresh(ctx)
