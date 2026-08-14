"""Test doubles that let a `MusicCatPlayer` run without a Lavalink server."""

from __future__ import annotations

import itertools
import time
from typing import Any

import lavalink
import pytest

from musiccat.player import MusicCatPlayer

_ids = itertools.count(1)


class FakeClient:
    """Stands in for `lavalink.Client`, recording the events a player dispatches."""

    def __init__(self) -> None:
        self.events: list[lavalink.Event] = []

    def _dispatch_event(self, event: lavalink.Event) -> None:
        self.events.append(event)


class FakeNodeManager:
    def __init__(self, client: FakeClient) -> None:
        self.client = client


class FakeNode:
    """Stands in for `lavalink.Node`, recording the player updates that were sent."""

    name = "test-node"
    region = "test"

    def __init__(self, client: FakeClient) -> None:
        self.manager = FakeNodeManager(client)
        self.updates: list[dict[str, Any]] = []

    async def update_player(self, guild_id: str, **kwargs: Any) -> None:
        self.updates.append({"guild_id": guild_id, **kwargs})
        return None


def make_track(title: str = "Track", *, duration: int = 200_000, seekable: bool = True) -> lavalink.AudioTrack:
    """Build an `AudioTrack` the same way lavalink.py builds one from a server response."""
    identifier = f"id-{next(_ids)}"
    return lavalink.AudioTrack(
        {
            "encoded": f"encoded-{identifier}",
            "info": {
                "identifier": identifier,
                "isSeekable": seekable,
                "author": "Author",
                "length": duration,
                "isStream": not seekable,
                "title": title,
                "uri": f"https://example.com/{identifier}",
                "artworkUrl": None,
                "sourceName": "youtube",
                "position": 0,
            },
        },
        requester=1,
    )


def set_position(player: MusicCatPlayer, milliseconds: int) -> None:
    """
    Place playback at a position.

    `DefaultPlayer.position` extrapolates from the last update it got from the node, using a
    monotonic clock.
    """
    player._last_update = int(time.monotonic() * 1000)
    player._last_position = milliseconds


def confirm_playback(player: MusicCatPlayer) -> None:
    """
    Stand in for the server confirming the track that was sent to it.

    Lavalink.py only moves a track into `player.current` when the node reports that it started,
    so nothing is "current" until that happens.
    """
    if player._next is not None:
        player.current, player._next = player._next, None


@pytest.fixture
def client() -> FakeClient:
    return FakeClient()


@pytest.fixture
def node(client: FakeClient) -> FakeNode:
    return FakeNode(client)


@pytest.fixture
def player(node: FakeNode) -> MusicCatPlayer:
    player = MusicCatPlayer(guild_id=1, node=node)  # type: ignore[arg-type]
    player.channel_id = 99  # `is_connected` reads this.
    return player
