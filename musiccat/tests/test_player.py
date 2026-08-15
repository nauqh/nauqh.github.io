from __future__ import annotations

import lavalink
import pytest

from musiccat.player import MusicCatPlayer
from tests.conftest import FakeClient
from tests.conftest import confirm_playback
from tests.conftest import make_track


@pytest.mark.asyncio
async def test_skip_returns_the_track_it_replaced(player: MusicCatPlayer) -> None:
    current, upcoming = make_track("current"), make_track("upcoming")
    player.current = current
    player.queue.append(upcoming)

    skipped = await player.skip()
    confirm_playback(player)

    assert skipped is current
    assert player.current is upcoming


@pytest.mark.asyncio
async def test_stop_resets_everything_and_announces_the_end(player: MusicCatPlayer, client: FakeClient) -> None:
    player.current = make_track("current")
    player.queue.append(make_track("upcoming"))
    player.set_loop(MusicCatPlayer.LOOP_QUEUE)
    player.set_shuffle(True)
    player.announce_channel_id = 42

    await player.stop()

    assert player.current is None
    assert player.queue == []
    assert player.loop == MusicCatPlayer.LOOP_NONE
    assert player.shuffle is False
    assert player.announce_channel_id is None
    assert any(isinstance(event, lavalink.QueueEndEvent) for event in client.events)


@pytest.mark.asyncio
async def test_stop_resets_state_even_when_the_node_is_unreachable(player: MusicCatPlayer) -> None:
    async def explode(*_: object, **__: object) -> None:
        raise lavalink.ClientError("node is gone")

    player.node.update_player = explode  # type: ignore[method-assign]
    player.current = make_track("current")
    player.queue.append(make_track("upcoming"))

    await player.stop()

    assert player.current is None
    assert player.queue == []


def test_remove_pops_by_index(player: MusicCatPlayer) -> None:
    first, second = make_track("first"), make_track("second")
    player.queue.extend([first, second])

    assert player.remove(0) is first
    assert player.queue == [second]

    with pytest.raises(IndexError):
        player.remove(5)
