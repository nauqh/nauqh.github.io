"""A thin client for the LavaSearch plugin's ``/v4/loadsearch`` endpoint.

Lavalink.py has no first-class support for LavaSearch, but it does expose `Node.request`,
which is all this needs.
"""

from __future__ import annotations

import asyncio
import dataclasses
import logging
from collections.abc import Iterable
from collections.abc import Mapping
from typing import Any

import lavalink

LOGGER = logging.getLogger(__name__)

ALL_TYPES = ("track", "artist", "playlist", "album")


@dataclasses.dataclass(frozen=True, slots=True)
class SearchItem:
    """A non-track LavaSearch result - an artist, album or playlist."""

    title: str
    author: str
    uri: str
    artwork_url: str | None
    item_type: str | None

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> SearchItem:
        info: Mapping[str, Any] = payload.get("info") or {}
        plugin_info: Mapping[str, Any] = payload.get("pluginInfo") or {}
        return cls(
            title=info.get("name") or plugin_info.get("author") or "Unknown",
            author=plugin_info.get("author") or "",
            uri=plugin_info.get("url") or info.get("url") or "",
            artwork_url=plugin_info.get("artworkUrl") or info.get("artworkUrl"),
            item_type=plugin_info.get("type"),
        )


@dataclasses.dataclass(frozen=True, slots=True)
class LavaSearchResult:
    """The parsed body of a LavaSearch response."""

    tracks: tuple[lavalink.AudioTrack, ...] = ()
    albums: tuple[SearchItem, ...] = ()
    artists: tuple[SearchItem, ...] = ()
    playlists: tuple[SearchItem, ...] = ()
    texts: tuple[str, ...] = ()

    @property
    def is_empty(self) -> bool:
        return not (self.tracks or self.albums or self.artists or self.playlists)

    @classmethod
    def from_payload(cls, payload: Mapping[str, Any]) -> LavaSearchResult:
        return cls(
            tracks=tuple(lavalink.AudioTrack(track, 0) for track in payload.get("tracks") or ()),
            albums=_items(payload.get("albums")),
            artists=_items(payload.get("artists")),
            playlists=_items(payload.get("playlists")),
            texts=tuple(payload.get("texts") or ()),
        )


def _items(payloads: Iterable[Mapping[str, Any]] | None) -> tuple[SearchItem, ...]:
    return tuple(SearchItem.from_payload(payload) for payload in payloads or ())


async def load_search(
    node: lavalink.Node,
    query: str,
    types: Iterable[str] = ALL_TYPES,
) -> LavaSearchResult:
    """
    Run a LavaSearch query against a node.

    Args:
        node: The node to query. It must have the LavaSearch plugin installed.
        query: A prefixed search query, e.g. ``spsearch:never gonna give you up``.
        types: The result types to ask for.

    Returns:
        The parsed results. Empty if the node has nothing to offer for the query, or if the
        request failed - a failed autocomplete lookup is not worth interrupting the user for.
    """
    try:
        payload = await node.request(
            "GET",
            "loadsearch",
            params={"query": query, "types": ",".join(types)},
        )
    except (lavalink.LavalinkError, OSError, asyncio.TimeoutError) as e:
        LOGGER.warning("LavaSearch request failed on node %r: %s", node.name, e)
        return LavaSearchResult()

    # The plugin answers 204 (which lavalink.py surfaces as `True`) when it has no results.
    if not isinstance(payload, Mapping):
        return LavaSearchResult()

    return LavaSearchResult.from_payload(payload)
