# Design

How the bot is put together, and why the rewrite is shaped differently from the
[`legacy-python`](https://github.com/bachtran02/MusicCat/tree/legacy-python)
branch it replaces. What the product is meant to do is [prd.md](prd.md); the
libraries and their versions are [`pyproject.toml`](../pyproject.toml).

The rule this document is written against: **the legacy bot had no seam between
Discord and Lavalink.** Every command reached through `bot.d.lavalink` into a
player and orchestrated its own joining, loading, queueing and replying —
`extensions/play.py` imported `_play` and `_get_tracks` out of a module called
`library/base.py` that also held the embed-building. There was one global
mutable bag (`bot.d`) and **32 reads of `bot.d.lavalink`** through it. The
rewrite puts exactly one module between the two worlds and makes the dependency
explicit.

## Vocabulary

Small, but the words are load-bearing and two of them were used loosely before.

**Player** — the guild's `MusicCatPlayer`: its queue, history, loop and shuffle
state, and a handle on its now-playing message. One per guild, created on the
first join, destroyed by Lavalink. _Avoid_: session, connection.

**Queue** — the tracks waiting. The currently playing track is **not** in it;
`player.current` is separate, and Lavalink only sets it when the node confirms
the track started.

**Now-playing message** — the embed posted when a track starts and deleted when
the queue ends. Exactly one per guild at a time. It carries no components: it
announces, it does not control. _Avoid_: player message, controller, view.

**Announce channel** — where the next now-playing message will be posted: the
channel the most recent queueing command came from. _Avoid_: text channel, send
channel — the legacy player carried both, plus `message_id`, and the three were
cleared in different places.

**Source** — a search backend behind a Lavalink prefix (`ytsearch`, `dzsearch`,
`spsearch`). Not every Source is **playable**: Spotify is mirrored onto another
source by LavaSrc, which is why `Source.playable` exists.

**Load result** — what a query resolved to. One of track, search, playlist,
empty or error. A playlist may carry richer plugin metadata (artist, album)
which changes only how it is described, never how it is queued.

## Shape

```
   ┌──────────────────────────────────────────────┐
   │  Discord                                     │
   │  slash commands · voice state                │
   └───────────────┬──────────────────────────────┘
                   │ gateway (GUILDS, GUILD_VOICE_STATES)
   ┌───────────────▼──────────────────────────────┐
   │  hikari  GatewayBot                          │
   │     └── lightbulb  Client                    │
   │            commands · hooks · menus · DI     │
   ├──────────────────────────────────────────────┤
   │  musiccat                                    │
   │     hooks ──► service ──► player             │
   │     ui    ◄── events                         │
   └───────────────┬──────────────────────────────┘
                   │ lavalink.py 5.11
   ┌───────────────▼──────────────────────────────┐
   │  Lavalink v4 node                            │
   │     youtube-plugin · LavaSrc · LavaSearch    │
   └───────────────┬──────────────────────────────┘
                   │
        YouTube · Spotify · Deezer · SoundCloud
```

Two processes: the bot and the node. No database, no queue, no worker, no cron —
the only state is in memory, and it is meant to be. A restart drops the queues,
which is the same behaviour the legacy bot had and has never been a complaint.

## Layout

```
musiccat/
├── musiccat/
│   ├── bot.py            entrypoint: hikari bot, lightbulb client, Lavalink client
│   ├── config.py         the environment → a frozen Config
│   ├── service.py        join · resolve · enqueue — the one seam
│   ├── player.py         MusicCatPlayer, history, the now-playing handle
│   ├── events.py         Lavalink events → the now-playing message
│   ├── hooks.py          the command checks
│   ├── search.py         the LavaSearch plugin client
│   ├── embeds.py         embed builders
│   ├── formatting.py     durations, progress bar, trimming
│   ├── responses.py      replying, and the self-deleting reply
│   ├── errors.py         errors that carry a user-facing message
│   ├── sources.py        the search sources and their prefixes
│   ├── constants.py      the three embed emojis
│   ├── log_config.py     dictConfig
│   └── extensions/       general · play · playback · queue · admin
├── lavalink/             the node's application.yml
├── tests/
└── docs/
```

## The modules

Eight that matter, each stated as its interface. Everything else is
implementation.

| Module | Interface | What it hides |
|---|---|---|
| `Config` | `from_env() -> Config` | env parsing, the multi-node JSON, every validation error |
| `service` | `join()` · `resolve()` · `enqueue()` | voice connection, query prefixing, five load-result shapes, playlist metadata |
| `MusicCatPlayer` | `skip()` · `stop()` · `remove()` | resetting to a clean state even when the node is unreachable |
| `LavalinkEventHandler` | nothing — it consumes events | the now-playing message lifecycle |
| `search` | `load_search(node, query, types)` | the plugin's REST contract, its 204, its failures |
| `hooks` | four execution hooks | voice-state cache lookups and dependency injection |
| `responses` | `respond(ctx, **kwargs)` | the self-deleting reply lightbulb no longer provides |
| `embeds` | four builders | every embed shape in the bot |

There is no persistence layer, no DTO layer and no repository. The player *is*
the model, and `lavalink.AudioTrack` is the only track type that crosses a
boundary.

### `service` — the one real seam

Three functions, and every command that touches music goes through them:

- **`join(bot, lavalink_client, guild_id, user_id) -> (player, channel_id)`** —
  finds the caller's voice channel, creates the player, connects deafened.
- **`resolve(lavalink_client, query, source) -> LoadResult`** — strips `<>`,
  prefixes bare queries with the source's search prefix, leaves URLs alone, and
  turns every failure into a `NoResults` carrying something worth showing a user.
- **`enqueue(...) -> Embed`** — joins if needed, adds the tracks, sets loop mode,
  starts playback if idle, and returns the embed describing what happened.

The legacy equivalents were `_join`, `_get_tracks` and `_play` in
`library/base.py`, and the seam leaked in both directions. `_play` took a
`bot` and reached into `bot.d.lavalink` itself; `_get_tracks` smuggled the
playlist URL forward by writing it onto `result.tracks[0].user_data`
(`library/base.py:41`) for `_play` to read back out four lines later. Here the
original query is a parameter, and playlist provenance is attached to every
track as a typed `PlaylistRef` on `track.extra` — which is a plain dict that
always exists, where `user_data` is `None` for any track the server did not tag.

`_join` returned `None` on every path (`library/base.py:14-27`), and the `join`
command then read `player.channel_id` off it (`extensions/bot.py:31`). The
command had been broken for as long as the file existed. `join` now returns
both the player and the channel it joined.

### `MusicCatPlayer` — three additions, and one correction

Subclasses `lavalink.DefaultPlayer`. It adds a bounded `history`, a `play(index=)`
that bypasses shuffle, and a `stop()` that resets rather than merely stops.

**History is recorded on `TrackStartEvent`, not on play.** The legacy player
overrode `play()` wholesale — sixty lines duplicated out of the library — partly
to append to `recently_played` at the point of dispatch. Copying a library method
means re-copying it on every upgrade, and the copy had already drifted: it still
awaited `client._dispatch_event`, which became synchronous in lavalink.py 5.x.
Recording on the event instead is both smaller and truer, because the event is
the only moment a track is actually playing.

**Loop constants are the library's.** The legacy player redefined them
(`library/player.py:10-12`) as `LOOP_QUEUE = 1`, `LOOP_SINGLE = 2` — inverted
against `lavalink.DefaultPlayer`, where `LOOP_SINGLE = 1` and `LOOP_QUEUE = 2`.
Both sets were live in the same process: `/loop track` called `set_loop(1)`
(`extensions/player.py:148`) and the overridden `play()` then read that 1 as its
own `LOOP_QUEUE` and appended the current track to the end of the queue. **`/loop
track` looped the queue.** It went unnoticed because a single-track queue makes
the two indistinguishable. The rewrite defines no constants of its own, and loop
is now the `loop` option on `/play` and `/search` rather than a command.

**`play_previous` suspends the loop mode.** Stepping back pushes the previous and
current tracks onto the front of the queue and plays index 0. `DefaultPlayer.play`
re-queues `current` whenever a track is passed explicitly, which under any loop
mode would duplicate the track that was just pushed. The loop is set to
`LOOP_NONE` for the duration and restored in a `finally`.

**`stop()` resets state even when the node is unreachable.** It is called from
the voice-state handler when the bot has just been disconnected — which is
exactly the moment the node may already be gone. The node calls are wrapped; the
local reset is not conditional on them.

`stop()` ends by dispatching `QueueEndEvent`, which is how the now-playing
message comes down. `DefaultPlayer.play` dispatches the same event when it runs
out of queue and *also* calls `stop()` on the way, so the event can arrive twice
for one ending. Teardown is therefore idempotent by construction rather than by
guard: `clear_now_playing` takes the reference off the player before it awaits
anything, so the second call finds nothing to do.

### `LavalinkEventHandler` — the now-playing message

One message per guild, replaced on every track change:

```
TrackStartEvent ──► post_now_playing
                      ├─ clear_now_playing   delete the old message
                      └─ rest.create_message(embed)

QueueEndEvent ────► clear_now_playing
```

It carries **no components**. An earlier revision made it a
`lightbulb.components.Menu` with six buttons — previous, pause, next, loop,
shuffle, stop — and that came with a defect worth recording, because anyone
adding buttons back will meet it.

Lightbulb offers `Menu.attach_persistent(client, timeout=None)` for a menu that
should outlive the command that created it. Its `MenuHandle.stop_interacting()`
cannot actually detach the menu: `MenuHandle.__init__` accepts an `_am` argument
and then assigns `self.__am = None`, discarding it
(`lightbulb/components/menus.py:579-587`). With `timeout=None` nothing else sets
it, so the container is never discarded from `client._attached_menus` — a set
consulted on every component interaction, leaking one entry per track played.
The working alternative is `asyncio.create_task(menu.attach(client,
timeout=None))` and cancelling the task, because `attach` discards in a
`finally`.

Buttons also need care that commands do not: a callback whose action deletes the
message must `defer(edit=True)` first, and a `predicate` returning `False`
without responding both show the user "interaction failed".

None of that is in the bot now. It is written down because it was paid for once.

### `search` — the LavaSearch client

lavalink.py has no support for the LavaSearch plugin, so `/search` autocomplete
calls `GET /v4/loadsearch` itself. The legacy version reached into
`node._transport._request` (`extensions/play.py:39`); `Node.request` is public in
5.11, so this is now a supported call.

Two shapes have to be handled that the legacy code did not. The plugin answers
**204 No Content** when it has nothing, which lavalink.py surfaces as the boolean
`True` rather than a mapping — so the return is type-checked, not trusted. And a
node that is down must not break autocomplete: every failure returns an empty
result, because a dropped autocomplete is invisible and a raised one is a
traceback per keystroke.

`/search` on YouTube does not use the plugin at all — YouTube has no rich
artist/album results — so it falls back to an ordinary search through `resolve`.

### `hooks` — checks, and where the Lavalink client comes from

Four hooks, all on the `CHECKS` step: `guild_only`, `valid_user_voice`,
`player_connected`, `player_playing`. Each raises a `MusicCatError` subclass
carrying its own user-facing message; the client's single error handler replies
with it ephemerally and handles nothing else specially.

They are also where the dependency injection shows. Lightbulb 3 wraps every hook,
invoke method, listener and autocomplete provider with `linkd`'s injector, so a
hook declares what it needs:

```python
@lightbulb.hook(lightbulb.ExecutionSteps.CHECKS)
def player_playing(
    _: lightbulb.ExecutionPipeline,
    ctx: lightbulb.Context,
    lavalink_client: lavalink.Client = lightbulb.di.INJECTED,
) -> None:
```

This replaces `bot.d.lavalink` — an untyped attribute on a global bag, read at
32 sites, with nothing to catch a typo until runtime.

**The registration is ordered against a one-shot window.** `lavalink.Client`
needs the bot's own user id, which does not exist until Discord says so; the DI
registry freezes as soon as the first container is created, which happens on the
first command. Both facts point at the same place, so `StartedEvent` does all of
it in one listener — build the Lavalink client, register it, load the extensions,
then `client.start()`. `client.start` is deliberately **not** subscribed to
`StartedEvent` separately, the way lightbulb's own documentation suggests,
because hikari dispatches listeners concurrently and the order would not hold.

### `responses` — the reply lightbulb stopped providing

Lightbulb 2 had `ctx.respond(..., delete_after=60)`, used on 13 replies.
Lightbulb 3 has no equivalent. `responses.respond` sends the reply, then
schedules the delete on a task held in a module-level set — the event loop keeps
only weak references to tasks, so an unheld one can be collected mid-sleep.
`DELETE_AFTER=0` turns the behaviour off.

## Command surface

9 commands, in five extensions. Every one is a `lightbulb.SlashCommand`
subclass registered on a `Loader`.

The legacy bot had 18. `/now` went because the now-playing message *is* the
now-playing display, `/restart` with `/seek`, `/join` because
`/play` connects on its own, and `/resume` because `/pause` toggles. `/loop` and
`/shuffle` became options on `/play` and `/search`, set once at queueing time
rather than adjusted mid-track. `/stop` went because `/leave` covers it —
disconnecting clears the player.

`/seek` and `/effects` went last, and unlike the rest they were not redundant —
they are simply out of scope for what this bot is now. Their removal takes the
equalizer and timescale filters out of the node config with them.

Two capabilities were genuinely lost rather than moved: **stepping backwards
through history**, which went with the buttons, and **seeking within a track**.
Both are recoverable, and neither is a one-liner — the first needs the player's
history back, the second a position parser.

```
general    /leave                                 hooks: guild, voice, connected

play       /play    query next loop shuffle       hooks: guild, voice
           /search  query type source + the above hooks: guild, voice
                    query autocompletes; type and source drive LavaSearch

playback   /pause   toggles                       hooks: guild, voice, playing
           /skip

queue      /queue                                 hooks: guild, playing
           /remove  track       autocompletes from the live queue

admin      /stats /info                           hooks: owner only
```

`/queue` deliberately carries no voice check — reading what is playing is not a
privileged act, and requiring channel membership to answer "what is this song"
was friction with no threat behind it.

`next`, `loop` and `shuffle` are **boolean options**. The legacy versions were
string options constrained to `choices=['True']` and then parsed with
`eval(ctx.options.next)` (`extensions/play.py:93-95`). The choice list kept the
input to one literal, so it was never a live injection — but it is `eval` on an
argument that arrived over the network, and Discord has had a boolean option type
the whole time.

## Configuration

Everything is environment, read once into a frozen `Config` at startup. The
legacy bot hardcoded the node in `bot/config.py` — host, port, password and a
two-node list — so pointing it at a different node was a code change.

| Tier | Contents |
|---|---|
| Required | `DISCORD_TOKEN` (`TOKEN` still accepted, for the legacy `.env`) |
| Node | `LAVALINK_HOST` `_PORT` `_PASSWORD` `_REGION` `_SSL` `_NODE_NAME` |
| Node, plural | `LAVALINK_NODES` — JSON array of partial node objects, each falling back to the singular vars |
| Behaviour | `DEFAULT_GUILDS` · `DELETE_AFTER` · `LOG_LEVEL` · `LOG_DIR` |

A bad value fails the boot with the variable named, not the first command that
touches it. `LAVALINK_NODES` takes partial objects on purpose: the common
multi-node case differs by name and region only, and repeating the password per
node is how passwords end up disagreeing.

`DEFAULT_GUILDS` registers commands to named guilds instead of globally, which is
the difference between seeing an edited command immediately and waiting out
Discord's global propagation.

The node's own configuration is [`lavalink/application.yml.example`](../lavalink/application.yml.example)
— plugins and sources. Every audio filter is off: the bot applies none since
`/effects` was removed.

## Testing

92 tests, no network, ~0.6s. Each module is tested through the interface its
callers use.

- `Config` — the environment is a parameter, so every case is a dict.
- `MusicCatPlayer` — a fake node recording `update_player` calls, and a fake
  client recording dispatched events.
- `service` — a fake Lavalink client; asserts the queries sent, the queue built,
  and the embeds returned.
- `search` — a fake node returning recorded payloads, the 204, and a raised error.
- `hooks` — run through a real `linkd` container, so the test proves the
  injection works and not merely the logic.
- `events` — a fake REST, asserting the message is posted, replaced, and deleted
  exactly once even when teardown runs twice.

Two library behaviours the tests had to model rather than assume, both found by
tests failing for the right reason:

- **`player.current` is set by the node, not by `play()`.** lavalink.py stages
  the track in `player._next` and promotes it when the track-start frame arrives
  (`lavalink/transport.py:315`). `confirm_playback()` in `conftest.py` stands in
  for that frame.
- **`player.position` extrapolates from a monotonic clock**, not the wall clock
  (`lavalink/player.py:145`). A fixture written with `time.time()` produced a
  position tens of years in the past and sent `play_previous` down the wrong
  branch.

There is no test that talks to Discord or to a Lavalink node. The offline
ceiling is the command surface: a script builds the client, loads all five
extensions and renders all 18 command builders exactly as Discord would receive
them — names, option types, required flags, autocomplete flags, choice counts —
which catches the whole class of registration errors without a token.

## What the rewrite costs

The package is **1,866 lines against the legacy `bot/`'s 1,578**, plus 977 lines
of tests where there were none. Stated plainly because the direction is the
wrong one for a simplification: the growth is docstrings, type annotations,
`config.py` (146 lines that were previously eight hardcoded ones), and typed
errors. The parts that were genuinely too big got smaller — the copied 56-line
`play()` override is under 30, `library/base.py`'s 105 lines of mixed
orchestration and embed-building split into `service.py` and `embeds.py`, and
and dropping the buttons deleted `ui.py` outright along with the player's
history, `play_previous` and `play(index=)` — 119 lines of module and 83 of
player, none of which had another caller.

## Why this stack

Re-examined 2026-08-14, after the port, on the question of whether Lavalink is
still the right audio backend. It is, but not for the reason people usually give.

**The audio server.** Every credible option was checked for whether it is alive:

| | Latest | Last commit | Verdict |
|---|---|---|---|
| **Lavalink** (JVM) | 4.2.2 | 2026-06-08 | Alive. DAVE (E2EE voice) support since 4.2.0 |
| **NodeLink** (Node.js) | — | 2026-06-17 | Alive, but see below |
| **FrequenC** (C) | — | 2024-09-23 | Dead, two years |

NodeLink is the only real contender, and it is genuinely attractive on
resources — its README claims ~24 MB idle against a JVM's hundreds. Two facts
rule it out here. It has **no LavaSearch and no Lavalink plugin system** —
`loadsearch` does not appear anywhere in its source — so `/search`'s
artist/album/playlist autocomplete, the bot's most distinctive feature, would
have to go. And its own client compatibility table lists Lavalink.py at
**"v3 supported? unknown"**, tested only against NodeLink v1 and v2; Wavelink is
the sole Python client marked as supported, and Wavelink is discord.py-only.
Switching would mean losing a feature *and* changing the client library.

**Not using an audio server at all** was considered and is not available to us.
hikari ships `VoiceComponent` and `VoiceConnection` as abstractions with no
implementation behind them — no opus pipeline, no source resolution. Native
playback is a discord.py capability (FFmpeg + `yt-dlp`), and taking it would mean
changing Discord libraries, transcoding on the bot's own CPU, and owning the
YouTube arms race directly instead of consuming someone else's fixes.

**The client.** `lavalink.py` 5.11.0, last commit 2026-06-14. The alternative for
a hikari bot is `hikari-ongaku` 1.0.4, which is hikari-native and would remove
the manual voice-state forwarding in `extensions/general.py`. It was rejected on
cadence: its most recent commit (2026-03-01) is *"Support Lavalink V4.2.0"* —
that is the version of Lavalink released in February, so it tracks the server
rather than leading it, where lavalink.py already carried the DAVE `channelId`
field before it was needed. The ergonomic win is one listener; the cost is
rewriting `player.py`, `service.py` and `events.py`.

**DAVE.** Lavalink 4.2.0 added support for Discord's end-to-end encrypted voice
and requires the client to send a `channelId` in the voice state. lavalink.py
sends it (`lavalink/abc.py:259`), and `extensions/general.py` supplies it. This
was checked rather than assumed, because it is the one upcoming Discord change
that could stop the bot dead.

**The actual risk is YouTube, and it is not a stack decision.** youtube-source's
most recent commit at the time of writing is *"Revert client version upgrade
(apparently older works better…)"* — the arms race, live. Every option above
loses playback the same week when YouTube changes something; the only thing that
varies is who ships the fix. Lavalink's plugin does, faster than the alternatives
and much faster than a bot maintaining `yt-dlp` itself. That, rather than
performance or ergonomics, is the argument for this stack.

## Deliberately absent

`hikari-miru` · `bot.d` · a custom `AutocompleteChoice` class · a copied `play()`
override · private `_transport` access · `eval` on options · hardcoded node
config · application-specific emoji IDs · component menus and the player buttons
· a database · a queue · a worker · persistence across restarts.

The emoji are the subtlest of those. The legacy bot carried eleven custom emojis
belonging to its own Discord application, and **no other application can render
another's** — a fork would have got blank or rejected buttons with nothing in the
logs to explain it. Three survive, Unicode, for the progress bar in the embed.

`hikari-miru` went because lightbulb 3 ships component menus, and one dependency
that does the job is better than two that overlap. The `AutocompleteChoice`
class (`library/classes/choice.py`, 25 lines re-implementing a hikari builder)
went because `hikari.impl.AutocompleteChoiceBuilder` exists.

## Deferred

Persistence across restarts, multi-node failover testing, `/previous` as a
command, and a CI workflow. None is blocked by
anything here; each is out of scope for a port whose contract was to change the
libraries and not the product.

Accepted risk: **nothing in this rewrite has run against Discord or a live
Lavalink node.** The offline checks are thorough about shape and silent about
behaviour, and the first real run should be against a test guild with
`DEFAULT_GUILDS` set.
