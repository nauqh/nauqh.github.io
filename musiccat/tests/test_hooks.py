"""The command checks, exercised through the dependency injection they rely on."""

from __future__ import annotations

import dataclasses
from typing import Any

import hikari
import lavalink
import lightbulb
import linkd
import pytest

from musiccat import errors
from musiccat import hooks
from musiccat.player import MusicCatPlayer
from tests.conftest import make_track

BOT_ID = 100
USER_ID = 200
GUILD_ID = 1
BOT_CHANNEL_ID = 10
OTHER_CHANNEL_ID = 11


@dataclasses.dataclass
class FakeVoiceState:
    channel_id: int | None


class FakeCache:
    def __init__(self, states: dict[int, FakeVoiceState]) -> None:
        self._states = states

    def get_voice_state(self, guild_id: int, user_id: int) -> FakeVoiceState | None:
        return self._states.get(user_id)


class FakeBot:
    def __init__(self, states: dict[int, FakeVoiceState]) -> None:
        self.cache = FakeCache(states)

    def get_me(self) -> Any:
        return _Me()


class _Me:
    id = BOT_ID


class FakePlayerManager:
    def __init__(self, player: Any) -> None:
        self._player = player

    def get(self, guild_id: int) -> Any:
        return self._player


class FakeLavalinkClient:
    def __init__(self, player: Any = None) -> None:
        self.player_manager = FakePlayerManager(player)


@dataclasses.dataclass
class FakeUser:
    id: int


class FakeClient:
    """`ExecutionHook.__call__` reads the client's enabled features off the context."""

    _features: tuple[Any, ...] = ()


@dataclasses.dataclass
class FakeContext:
    guild_id: int | None
    user: FakeUser
    client: FakeClient = dataclasses.field(default_factory=FakeClient)


async def run_hook(
    hook: Any,
    ctx: Any,
    *,
    bot: Any = None,
    lavalink_client: Any = None,
) -> None:
    """Run an execution hook, with its dependencies available for injection."""
    manager = linkd.DependencyInjectionManager()
    registry = manager.registry_for(lightbulb.di.Contexts.DEFAULT)

    if bot is not None:
        registry.register_value(hikari.GatewayBot, bot)
    if lavalink_client is not None:
        registry.register_value(lavalink.Client, lavalink_client)

    async with manager.enter_context(lightbulb.di.Contexts.DEFAULT):
        await hook(None, ctx)


def context(*, guild_id: int | None = GUILD_ID, user_id: int = USER_ID) -> FakeContext:
    return FakeContext(guild_id=guild_id, user=FakeUser(id=user_id))


@pytest.mark.asyncio
async def test_guild_only_rejects_a_direct_message() -> None:
    with pytest.raises(errors.GuildOnly):
        await run_hook(hooks.guild_only, context(guild_id=None))


@pytest.mark.asyncio
async def test_guild_only_lets_a_guild_command_through() -> None:
    await run_hook(hooks.guild_only, context())


@pytest.mark.asyncio
async def test_a_caller_outside_voice_is_rejected() -> None:
    bot = FakeBot({BOT_ID: FakeVoiceState(BOT_CHANNEL_ID)})

    with pytest.raises(errors.NotInVoice):
        await run_hook(hooks.valid_user_voice, context(), bot=bot)


@pytest.mark.asyncio
async def test_a_caller_in_another_channel_is_rejected() -> None:
    bot = FakeBot({BOT_ID: FakeVoiceState(BOT_CHANNEL_ID), USER_ID: FakeVoiceState(OTHER_CHANNEL_ID)})

    with pytest.raises(errors.NotSameVoice):
        await run_hook(hooks.valid_user_voice, context(), bot=bot)


@pytest.mark.asyncio
async def test_a_caller_in_the_same_channel_is_allowed() -> None:
    bot = FakeBot({BOT_ID: FakeVoiceState(BOT_CHANNEL_ID), USER_ID: FakeVoiceState(BOT_CHANNEL_ID)})

    await run_hook(hooks.valid_user_voice, context(), bot=bot)


@pytest.mark.asyncio
async def test_a_caller_in_voice_is_allowed_while_the_bot_is_not_connected() -> None:
    bot = FakeBot({USER_ID: FakeVoiceState(OTHER_CHANNEL_ID)})

    await run_hook(hooks.valid_user_voice, context(), bot=bot)


@pytest.mark.asyncio
async def test_player_connected_requires_a_player() -> None:
    with pytest.raises(errors.PlayerNotConnected):
        await run_hook(hooks.player_connected, context(), lavalink_client=FakeLavalinkClient())


@pytest.mark.asyncio
async def test_player_connected_accepts_a_connected_player(player: MusicCatPlayer) -> None:
    await run_hook(hooks.player_connected, context(), lavalink_client=FakeLavalinkClient(player))


@pytest.mark.asyncio
async def test_player_playing_requires_a_loaded_track(player: MusicCatPlayer) -> None:
    with pytest.raises(errors.PlayerNotPlaying):
        await run_hook(hooks.player_playing, context(), lavalink_client=FakeLavalinkClient(player))


@pytest.mark.asyncio
async def test_player_playing_accepts_a_playing_player(player: MusicCatPlayer) -> None:
    player.current = make_track()

    await run_hook(hooks.player_playing, context(), lavalink_client=FakeLavalinkClient(player))
