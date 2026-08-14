"""Getting music into the queue: ``/play`` and ``/search``."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat import errors
from musiccat import hooks
from musiccat import responses
from musiccat import search
from musiccat import service
from musiccat import sources
from musiccat.formatting import trim

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()

MAX_CHOICES = 25
CHOICES_PER_TYPE = 5
CHOICE_NAME_LIMIT = 100

SOURCE_CHOICES = [lightbulb.Choice(source.display_name, source.display_name) for source in sources.SEARCHABLE]
TYPE_CHOICES = [lightbulb.Choice(name.capitalize(), name) for name in search.ALL_TYPES]


@lightbulb.di.with_di
async def query_autocomplete(
    ctx: lightbulb.AutocompleteContext[str],
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
    """Suggest tracks - and, on sources that support it, artists, albums and playlists."""
    query = str(ctx.focused.value or "").strip()
    if not query:
        await ctx.respond([])
        return

    source = _selected_source(ctx)
    query_type = _selected_type(ctx)

    try:
        choices = await _choices(lavalink_client, query, query_type=query_type, source=source)
    except errors.MusicCatError:
        choices = []

    await ctx.respond(choices[:MAX_CHOICES])


def _selected_source(ctx: lightbulb.AutocompleteContext[str]) -> sources.Source:
    option = ctx.get_option("source")
    display_name = str(option.value) if option is not None and option.value else ""
    return sources.BY_DISPLAY_NAME.get(display_name, sources.YOUTUBE)


def _selected_type(ctx: lightbulb.AutocompleteContext[str]) -> str | None:
    option = ctx.get_option("type")
    return str(option.value) if option is not None and option.value else None


async def _choices(
    lavalink_client: lavalink.Client,
    query: str,
    *,
    query_type: str | None,
    source: sources.Source,
) -> list[hikari.impl.AutocompleteChoiceBuilder]:
    """Build autocomplete choices, using LavaSearch where the source supports it."""
    if source not in sources.LAVASEARCH_SOURCES:
        result = await service.resolve(lavalink_client, query, source)
        return [
            _choice(f"🎬 {trim(track.title, 60)} [{trim(track.author, 20)}]", track.uri)
            for track in result.tracks[:MAX_CHOICES]
        ]

    node = lavalink_client.node_manager.find_ideal_node()
    if node is None:
        raise errors.NoNodesAvailable

    types = (query_type,) if query_type else search.ALL_TYPES
    per_type = MAX_CHOICES if query_type else CHOICES_PER_TYPE
    result = await search.load_search(node, source.query(query), types)

    choices = [
        _choice(f"🎵 {trim(track.title, 60)} - {trim(track.author, 20)}", track.uri)
        for track in result.tracks[:per_type]
    ]
    choices += [_choice(f"🎤 {trim(item.title, 80)}", item.uri) for item in result.artists[:per_type]]
    choices += [
        _choice(f"🎧 {trim(item.title, 60)} - {trim(item.author, 20)} ⭐", item.uri)
        for item in result.playlists[:per_type]
    ]
    choices += [
        _choice(f"💿 {trim(item.title, 60)} - {trim(item.author, 20)} 🎤", item.uri)
        for item in result.albums[:per_type]
    ]
    return [choice for choice in choices if choice.value]


def _choice(name: str, value: str) -> hikari.impl.AutocompleteChoiceBuilder:
    return hikari.impl.AutocompleteChoiceBuilder(name=trim(name, CHOICE_NAME_LIMIT), value=value)


async def _play(
    ctx: lightbulb.Context,
    bot: hikari.GatewayBot,
    lavalink_client: lavalink.Client,
    *,
    query: str,
    source: sources.Source,
    play_next: bool,
    loop: bool,
    shuffle: bool,
) -> None:
    """Resolve a query and queue whatever it turned into."""
    assert ctx.guild_id is not None

    result = await service.resolve(lavalink_client, query, source)
    embed = await service.enqueue(
        bot,
        lavalink_client,
        result,
        guild_id=ctx.guild_id,
        requester_id=ctx.user.id,
        channel_id=ctx.channel_id,
        query=query,
        play_next=play_next,
        loop=loop,
        shuffle=shuffle,
    )
    await responses.respond(ctx, embed=embed)


@loader.command
class Play(
    lightbulb.SlashCommand,
    name="play",
    description="Play a track or playlist URL, or search YouTube",
    hooks=[hooks.guild_only, hooks.valid_user_voice],
):
    query = lightbulb.string("query", "A URL, or something to search for")
    next = lightbulb.boolean("next", "Play this before the rest of the queue", default=False)
    loop = lightbulb.boolean("loop", "Loop the track or playlist once it starts", default=False)
    shuffle = lightbulb.boolean("shuffle", "Shuffle a playlist as it is queued", default=True)

    @lightbulb.invoke
    async def invoke(
        self,
        ctx: lightbulb.Context,
        bot: hikari.GatewayBot = lightbulb.di.INJECTED,
        lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
    ) -> None:
        await _play(
            ctx,
            bot,
            lavalink_client,
            query=self.query,
            source=sources.YOUTUBE,
            play_next=self.next,
            loop=self.loop,
            shuffle=self.shuffle,
        )


@loader.command
class Search(
    lightbulb.SlashCommand,
    name="search",
    description="Search a source for a specific track, artist, album or playlist",
    hooks=[hooks.guild_only, hooks.valid_user_voice],
):
    query = lightbulb.string("query", "What to search for", autocomplete=query_autocomplete)
    type = lightbulb.string("type", "Narrow the search to one kind of result", choices=TYPE_CHOICES, default="")
    source = lightbulb.string("source", "Where to search", choices=SOURCE_CHOICES, default=sources.YOUTUBE.display_name)
    next = lightbulb.boolean("next", "Play this before the rest of the queue", default=False)
    loop = lightbulb.boolean("loop", "Loop the track or playlist once it starts", default=False)
    shuffle = lightbulb.boolean("shuffle", "Shuffle a playlist as it is queued", default=True)

    @lightbulb.invoke
    async def invoke(
        self,
        ctx: lightbulb.Context,
        bot: hikari.GatewayBot = lightbulb.di.INJECTED,
        lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
    ) -> None:
        await _play(
            ctx,
            bot,
            lavalink_client,
            query=self.query,
            source=sources.BY_DISPLAY_NAME.get(self.source, sources.YOUTUBE),
            play_next=self.next,
            loop=self.loop,
            shuffle=self.shuffle,
        )
