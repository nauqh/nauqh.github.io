"""The now-playing message lifecycle."""

from __future__ import annotations

import base64
import dataclasses
from typing import Any

import hikari
import pytest

from musiccat.events import LavalinkEventHandler
from musiccat.player import MusicCatPlayer
from tests.conftest import make_track

# `hikari.GatewayBot` decodes the bot's user ID out of the token's first segment, so the token
# has to have a token's shape. Assembled at runtime to keep secret scanners off its back.
FAKE_TOKEN = ".".join([base64.b64encode(b"123456789012345678").decode(), "a" * 6, "b" * 27])
CHANNEL_ID = 42


@dataclasses.dataclass
class FakeMessage:
    id: int


class FakeRest:
    def __init__(self) -> None:
        self.created: list[dict[str, Any]] = []
        self.deleted: list[tuple[int, int]] = []
        self.fail_create: Exception | None = None

    async def create_message(self, channel: int, **kwargs: Any) -> FakeMessage:
        if self.fail_create is not None:
            raise self.fail_create
        self.created.append({"channel": channel, **kwargs})
        return FakeMessage(id=1000 + len(self.created))

    async def delete_message(self, channel_id: int, message_id: int) -> None:
        self.deleted.append((channel_id, message_id))


@pytest.fixture
def bot() -> Any:
    bot = hikari.GatewayBot(FAKE_TOKEN, banner=None, logs=None)
    bot._rest = FakeRest()  # type: ignore[assignment]
    return bot


@pytest.fixture
def handler(bot: Any) -> LavalinkEventHandler:
    return LavalinkEventHandler(bot)


@pytest.mark.asyncio
async def test_posting_the_player_message(
    handler: LavalinkEventHandler,
    bot: Any,
    player: MusicCatPlayer,
) -> None:
    player.current = make_track("Some Song")
    player.announce_channel_id = CHANNEL_ID

    await handler.post_now_playing(player)

    assert len(bot.rest.created) == 1
    assert bot.rest.created[0]["channel"] == CHANNEL_ID
    assert player.now_playing is not None
    assert player.now_playing.channel_id == CHANNEL_ID


@pytest.mark.asyncio
async def test_nothing_is_posted_without_a_channel_to_post_in(
    handler: LavalinkEventHandler, bot: Any, player: MusicCatPlayer
) -> None:
    player.current = make_track()

    await handler.post_now_playing(player)

    assert bot.rest.created == []
    assert player.now_playing is None


@pytest.mark.asyncio
async def test_a_new_track_replaces_the_previous_message(
    handler: LavalinkEventHandler,
    bot: Any,
    player: MusicCatPlayer,
) -> None:
    player.current = make_track("first")
    player.announce_channel_id = CHANNEL_ID
    await handler.post_now_playing(player)
    first_message_id = player.now_playing.message_id  # type: ignore[union-attr]

    player.current = make_track("second")
    await handler.post_now_playing(player)

    assert bot.rest.deleted == [(CHANNEL_ID, first_message_id)]
    assert len(bot.rest.created) == 2


@pytest.mark.asyncio
async def test_clearing_deletes_the_message(
    handler: LavalinkEventHandler,
    bot: Any,
    player: MusicCatPlayer,
) -> None:
    player.current = make_track()
    player.announce_channel_id = CHANNEL_ID
    await handler.post_now_playing(player)

    await handler.clear_now_playing(player)

    assert player.now_playing is None
    assert len(bot.rest.deleted) == 1


@pytest.mark.asyncio
async def test_clearing_twice_deletes_the_message_once(
    handler: LavalinkEventHandler, bot: Any, player: MusicCatPlayer
) -> None:
    player.current = make_track()
    player.announce_channel_id = CHANNEL_ID
    await handler.post_now_playing(player)

    await handler.clear_now_playing(player)
    await handler.clear_now_playing(player)

    assert len(bot.rest.deleted) == 1


@pytest.mark.asyncio
async def test_a_message_that_cannot_be_posted_is_not_recorded(
    handler: LavalinkEventHandler,
    bot: Any,
    player: MusicCatPlayer,
) -> None:
    player.current = make_track()
    player.announce_channel_id = CHANNEL_ID
    bot.rest.fail_create = hikari.ForbiddenError(url="", headers={}, raw_body=b"")  # type: ignore[arg-type]

    await handler.post_now_playing(player)

    assert player.now_playing is None
