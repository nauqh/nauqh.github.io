from __future__ import annotations

import lavalink
import pytest

from musiccat import errors
from musiccat import service
from musiccat import sources
from musiccat.player import MusicCatPlayer
from musiccat.player import get_playlist
from tests.conftest import confirm_playback
from tests.conftest import make_track

GUILD_ID = 1
REQUESTER_ID = 7
CHANNEL_ID = 42


class FakePlayerManager:
    def __init__(self, player: MusicCatPlayer | None) -> None:
        self._player = player

    def get(self, guild_id: int) -> MusicCatPlayer | None:
        return self._player


class FakeLavalinkClient:
    """Enough of `lavalink.Client` for `resolve` and `enqueue`."""

    def __init__(self, player: MusicCatPlayer | None = None, result: object = None) -> None:
        self.player_manager = FakePlayerManager(player)
        self.result = result
        self.queries: list[str] = []

    async def get_tracks(self, query: str) -> lavalink.LoadResult:
        self.queries.append(query)
        if isinstance(self.result, Exception):
            raise self.result
        assert isinstance(self.result, lavalink.LoadResult)
        return self.result


def playlist_result(
    tracks: list[lavalink.AudioTrack],
    *,
    name: str = "A Playlist",
    plugin_info: dict[str, object] | None = None,
) -> lavalink.LoadResult:
    return lavalink.LoadResult.from_playlist(
        tracks,
        lavalink.PlaylistInfo(name=name, selected_track=-1),
        plugin_info,
    )


async def enqueue(client: FakeLavalinkClient, result: lavalink.LoadResult, **kwargs: object) -> object:
    return await service.enqueue(
        None,  # type: ignore[arg-type] - only needed when the bot has to join voice
        client,  # type: ignore[arg-type]
        result,
        guild_id=GUILD_ID,
        requester_id=REQUESTER_ID,
        channel_id=CHANNEL_ID,
        **kwargs,  # type: ignore[arg-type]
    )


@pytest.mark.asyncio
async def test_a_bare_query_is_searched_on_the_given_source() -> None:
    client = FakeLavalinkClient(result=lavalink.LoadResult.from_search([make_track()]))

    await service.resolve(client, "never gonna give you up", sources.DEEZER)  # type: ignore[arg-type]

    assert client.queries == ["dzsearch:never gonna give you up"]


@pytest.mark.asyncio
async def test_a_url_is_looked_up_as_it_is() -> None:
    client = FakeLavalinkClient(result=lavalink.LoadResult.from_track(make_track()))

    await service.resolve(client, "<https://example.com/track>")  # type: ignore[arg-type]

    assert client.queries == ["https://example.com/track"]


@pytest.mark.asyncio
async def test_an_empty_result_raises_no_results() -> None:
    client = FakeLavalinkClient(result=lavalink.LoadResult.empty())

    with pytest.raises(errors.NoResults):
        await service.resolve(client, "nothing at all")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_a_load_error_is_reported_to_the_user() -> None:
    error = lavalink.LoadResultError({"message": "age restricted", "severity": "common", "cause": "x"})
    client = FakeLavalinkClient(result=lavalink.LoadResult.from_error(error))

    with pytest.raises(errors.NoResults, match="age restricted"):
        await service.resolve(client, "https://example.com/blocked")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_an_unreachable_node_is_reported_to_the_user() -> None:
    client = FakeLavalinkClient(result=lavalink.ClientError("no nodes"))

    with pytest.raises(errors.NoResults, match="audio server"):
        await service.resolve(client, "anything")  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_a_blank_query_never_reaches_lavalink() -> None:
    client = FakeLavalinkClient()

    with pytest.raises(errors.NoResults):
        await service.resolve(client, "   ")  # type: ignore[arg-type]

    assert client.queries == []


@pytest.mark.asyncio
async def test_queueing_a_track_starts_playback_and_describes_it(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    track = make_track("Some Song")

    embed = await enqueue(client, lavalink.LoadResult.from_track(track))
    confirm_playback(player)

    assert embed.title == "Track added"
    assert "Some Song" in embed.description
    assert player.current is track
    assert player.announce_channel_id == CHANNEL_ID


@pytest.mark.asyncio
async def test_play_next_puts_the_track_at_the_front(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    player.current = make_track("playing")
    player.queue.append(make_track("already queued"))
    jumped = make_track("jumped the queue")

    await enqueue(client, lavalink.LoadResult.from_track(jumped), play_next=True)

    assert player.queue[0] is jumped


@pytest.mark.asyncio
async def test_looping_a_single_track_loops_just_that_track(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)

    await enqueue(client, lavalink.LoadResult.from_track(make_track()), loop=True)

    assert player.loop == MusicCatPlayer.LOOP_SINGLE


@pytest.mark.asyncio
async def test_looping_a_playlist_loops_the_queue(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)

    await enqueue(client, playlist_result([make_track("a"), make_track("b")]), loop=True)

    assert player.loop == MusicCatPlayer.LOOP_QUEUE


@pytest.mark.asyncio
async def test_an_unshuffled_playlist_keeps_its_order(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    tracks = [make_track(f"track {i}") for i in range(5)]

    await enqueue(client, playlist_result(tracks), shuffle=False)
    confirm_playback(player)

    assert [track.title for track in [player.current, *player.queue]] == [t.title for t in tracks]


@pytest.mark.asyncio
async def test_playlist_tracks_remember_where_they_came_from(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    tracks = [make_track("a"), make_track("b")]

    await enqueue(
        client,
        playlist_result(tracks, name="Road Trip"),
        query="https://example.com/playlist/1",
        shuffle=False,
    )

    for track in tracks:
        playlist = get_playlist(track)
        assert playlist is not None
        assert playlist.name == "Road Trip"
        assert playlist.url == "https://example.com/playlist/1"


@pytest.mark.asyncio
async def test_a_search_query_is_not_mistaken_for_a_playlist_link(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)

    await enqueue(client, playlist_result([make_track("a")]), query="road trip mix", shuffle=False)
    confirm_playback(player)

    playlist = get_playlist(player.current)
    assert playlist is not None
    assert playlist.url is None


@pytest.mark.asyncio
async def test_a_plugin_album_is_described_as_an_album(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    plugin_info = {
        "type": "album",
        "url": "https://open.spotify.com/album/1",
        "artworkUrl": "https://example.com/art.png",
        "author": "Some Artist",
    }

    embed = await enqueue(client, playlist_result([make_track("a")], name="An Album", plugin_info=plugin_info))

    assert embed.title == "Album added"
    assert "Some Artist" in embed.description
    assert embed.thumbnail is not None


@pytest.mark.asyncio
async def test_a_plugin_artist_is_described_as_an_artist(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)
    plugin_info = {"type": "artist", "url": "https://open.spotify.com/artist/1", "author": "Some Artist"}

    embed = await enqueue(client, playlist_result([make_track("a")], name="Top Tracks", plugin_info=plugin_info))

    assert embed.title == "Artist added"
    assert "SOME ARTIST" in embed.description


@pytest.mark.asyncio
async def test_queueing_nothing_raises_no_results(player: MusicCatPlayer) -> None:
    client = FakeLavalinkClient(player=player)

    with pytest.raises(errors.NoResults):
        await enqueue(client, lavalink.LoadResult.empty())
