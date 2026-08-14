from __future__ import annotations

import lavalink
import pytest

from musiccat.player import HISTORY_LIMIT
from musiccat.player import MusicCatPlayer
from tests.conftest import FakeClient
from tests.conftest import confirm_playback
from tests.conftest import make_track
from tests.conftest import set_position


@pytest.mark.asyncio
async def test_play_index_takes_that_track_out_of_the_queue(player: MusicCatPlayer) -> None:
    first, second, third = make_track("first"), make_track("second"), make_track("third")
    player.queue.extend([first, second, third])

    await player.play(index=1)
    confirm_playback(player)

    assert player.current is second
    assert player.queue == [first, third]


@pytest.mark.asyncio
async def test_play_index_out_of_range_is_rejected(player: MusicCatPlayer) -> None:
    player.queue.append(make_track())

    with pytest.raises(ValueError, match="within the queue"):
        await player.play(index=5)


@pytest.mark.asyncio
async def test_play_rejects_track_and_index_together(player: MusicCatPlayer) -> None:
    player.queue.append(make_track())

    with pytest.raises(ValueError, match="cannot both be specified"):
        await player.play(make_track(), index=0)


@pytest.mark.asyncio
async def test_play_without_index_still_takes_the_front_of_the_queue(player: MusicCatPlayer) -> None:
    first, second = make_track("first"), make_track("second")
    player.queue.extend([first, second])

    await player.play()
    confirm_playback(player)

    assert player.current is first
    assert player.queue == [second]


def test_remember_keeps_the_history_bounded(player: MusicCatPlayer) -> None:
    for i in range(HISTORY_LIMIT + 10):
        player.remember(make_track(f"track {i}"))

    assert len(player.history) == HISTORY_LIMIT
    assert player.history[-1].title == f"track {HISTORY_LIMIT + 9}"


@pytest.mark.asyncio
async def test_play_previous_restarts_the_track_when_it_is_underway(player: MusicCatPlayer) -> None:
    previous, current = make_track("previous"), make_track("current")
    player.history.extend([previous, current])
    player.current = current
    set_position(player, 30_000)

    await player.play_previous()

    assert player.current is current
    assert player.history == [previous, current]


@pytest.mark.asyncio
async def test_play_previous_steps_back_and_requeues_the_current_track(player: MusicCatPlayer) -> None:
    previous, current, upcoming = make_track("previous"), make_track("current"), make_track("upcoming")
    player.history.extend([previous, current])
    player.current = current
    player.queue.append(upcoming)
    set_position(player, 1_000)

    await player.play_previous()
    confirm_playback(player)

    assert player.current is previous
    assert player.queue == [current, upcoming]
    assert player.history == []


@pytest.mark.asyncio
async def test_play_previous_does_not_duplicate_the_current_track_while_looping(player: MusicCatPlayer) -> None:
    previous, current = make_track("previous"), make_track("current")
    player.history.extend([previous, current])
    player.current = current
    player.set_loop(MusicCatPlayer.LOOP_QUEUE)
    set_position(player, 1_000)

    await player.play_previous()

    assert player.queue == [current]
    assert player.loop == MusicCatPlayer.LOOP_QUEUE


@pytest.mark.asyncio
async def test_play_previous_seeks_to_zero_without_enough_history(player: MusicCatPlayer) -> None:
    current = make_track("current")
    player.history.append(current)
    player.current = current
    set_position(player, 1_000)

    await player.play_previous()

    assert player.current is current


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
    player.history.append(make_track("played"))
    player.set_loop(MusicCatPlayer.LOOP_QUEUE)
    player.set_shuffle(True)
    player.announce_channel_id = 42

    await player.stop()

    assert player.current is None
    assert player.queue == []
    assert player.history == []
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
