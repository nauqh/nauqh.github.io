from __future__ import annotations

import pytest

from musiccat import search
from musiccat.search import LavaSearchResult
from musiccat.search import SearchItem

TRACK_PAYLOAD = {
    "encoded": "encoded",
    "info": {
        "identifier": "id",
        "isSeekable": True,
        "author": "Artist",
        "length": 1000,
        "isStream": False,
        "title": "Title",
        "uri": "https://open.spotify.com/track/id",
        "sourceName": "spotify",
    },
}


def test_items_prefer_plugin_info() -> None:
    item = SearchItem.from_payload(
        {
            "info": {"name": "Greatest Hits"},
            "pluginInfo": {"author": "Artist", "url": "https://example.com/album", "type": "album"},
        }
    )

    assert (item.title, item.author, item.uri, item.item_type) == (
        "Greatest Hits",
        "Artist",
        "https://example.com/album",
        "album",
    )


def test_items_survive_a_payload_with_nothing_in_it() -> None:
    item = SearchItem.from_payload({})

    assert (item.title, item.author, item.uri) == ("Unknown", "", "")


def test_a_full_response_is_parsed() -> None:
    result = LavaSearchResult.from_payload(
        {
            "tracks": [TRACK_PAYLOAD],
            "albums": [{"info": {"name": "Album"}, "pluginInfo": {"url": "u"}}],
            "artists": [{"info": {"name": "Artist"}, "pluginInfo": {"url": "u"}}],
            "playlists": [{"info": {"name": "Playlist"}, "pluginInfo": {"url": "u"}}],
            "texts": ["suggestion"],
        }
    )

    assert [track.title for track in result.tracks] == ["Title"]
    assert (result.albums[0].title, result.artists[0].title, result.playlists[0].title) == (
        "Album",
        "Artist",
        "Playlist",
    )
    assert result.texts == ("suggestion",)
    assert result.is_empty is False


def test_an_absent_section_is_empty_rather_than_missing() -> None:
    result = LavaSearchResult.from_payload({"tracks": [TRACK_PAYLOAD]})

    assert result.albums == ()
    assert result.is_empty is False


def test_an_empty_response_reports_itself_empty() -> None:
    assert LavaSearchResult.from_payload({}).is_empty is True


class FakeNode:
    name = "test-node"

    def __init__(self, response: object) -> None:
        self.response = response
        self.calls: list[dict[str, object]] = []

    async def request(self, method: str, path: str, **kwargs: object) -> object:
        self.calls.append({"method": method, "path": path, **kwargs})
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


@pytest.mark.asyncio
async def test_load_search_asks_for_the_requested_types() -> None:
    node = FakeNode({"tracks": [TRACK_PAYLOAD]})

    result = await search.load_search(node, "spsearch:hello", ("track", "album"))  # type: ignore[arg-type]

    assert node.calls[0]["params"] == {"query": "spsearch:hello", "types": "track,album"}
    assert len(result.tracks) == 1


@pytest.mark.asyncio
async def test_a_204_from_the_plugin_reads_as_no_results() -> None:
    # lavalink.py surfaces "204 No Content" as `True`.
    result = await search.load_search(FakeNode(True), "spsearch:nothing")  # type: ignore[arg-type]

    assert result.is_empty is True


@pytest.mark.asyncio
async def test_a_failed_request_reads_as_no_results() -> None:
    import lavalink

    result = await search.load_search(FakeNode(lavalink.ClientError("boom")), "spsearch:x")  # type: ignore[arg-type]

    assert result.is_empty is True
