# MusicCat 2.0 — Product Requirements

| | |
|---|---|
| **Status** | Implemented, unverified against live Discord |
| **Author** | — |
| **Last updated** | 2026-08-14 |
| **Engineering design** | [design.md](design.md) |
| **Supersedes** | [`bachtran02/MusicCat@legacy-python`](https://github.com/bachtran02/MusicCat/tree/legacy-python) |

## 1. Summary

MusicCat is a Discord music bot: members queue music from YouTube, Spotify and
Deezer with slash commands, and control playback from an interactive message the
bot keeps up to date.

This release rebuilds the bot on the current generation of its libraries, because
the versions it was pinned to can no longer be upgraded, and fixes the defects
that rebuild exposed.

It also **narrows the surface to 11 commands and no buttons**. The now-playing
message is an announcement rather than a control panel (§4.1).

## 2. Problem

The bot works. Its dependencies are stuck.

| Dependency | Pinned at | Current | Problem |
|---|---|---|---|
| `hikari` | `2.0.0.dev121` | `2.5.0` | Pinned to a **pre-release dev snapshot** from 2023-09-10; 2.5.0 shipped 2025-10-31 |
| `hikari-lightbulb` | `2.3.3` | `3.2.5` | The v2 line is superseded and does not support hikari 2.x stable |
| `hikari-miru` | `3.1.1` | `4.2.0` | Even 4.2.0 is from 2024-10-08 and caps Python at `<3.14` |
| `lavalink` | `5.1.0` | `5.11.0` | Ten minor versions of protocol and API drift |

These interlock. Lightbulb 2 cannot run on hikari 2.5, so hikari cannot be
upgraded alone; miru's Python ceiling caps the whole project's runtime regardless
of what the others support. There is no incremental path — the upgrade is all
four at once, and lightbulb 2 → 3 is a rewrite of every command definition rather
than a version bump.

The cost of not doing it compounds: the bot cannot move to a current Python, and
cannot take a fix from any of the four projects.

The rebuild also has to carry defects that the port surfaced. These are
pre-existing user-facing bugs, not new work:

| | Evidence |
|---|---|
| `/loop track` loops the **queue**, not the track | The player redefined lavalink's loop constants inverted (`library/player.py:10-12`); `/loop track` sends `1`, which the library reads as queue-loop |
| `/join` raises on every invocation | `_join` returns `None` (`library/base.py:14-27`); the command reads `.channel_id` off it (`extensions/bot.py:31`). Fixed, then the command was cut entirely (§4.1) |
| Playlist links can crash queueing | Playlist provenance is written to `track.user_data` (`library/base.py:41`), which is `None` for any track the server did not tag |
| Boolean-ish options are parsed with `eval` | `eval(ctx.options.next)` on a network-supplied argument (`extensions/play.py:93-95`) |
| The bot is unconfigurable without a code change | Node host, port and password are hardcoded (`bot/config.py`) |

## 3. Goals

- **G1 — Run on current libraries.** hikari 2.5, lightbulb 3.2, lavalink.py 5.11,
  on Python 3.10–3.14.
- **G2 — Preserve the product exactly.** Every command keeps its name, arguments
  and behaviour. No user has to learn anything.
- **G3 — Fix what the port exposed.** Ship none of the five defects above.
- **G4 — Make it deployable by someone who is not the author.** Configuration
  from the environment; one `docker compose up`.
- **G5 — Leave a safety net.** An automated test suite, where there was none.

## 4. Non-goals

- **New features.** No playlists, no persistence, no web UI, no lyrics, no
  autoplay. A port that grows features cannot be reviewed as a port.
- **Multi-tenancy or per-guild configuration.** One deployment, one set of
  settings, as before.
- **Persistence across restarts.** Queues are in memory and are lost on restart —
  unchanged, and never a complaint.
- **Pixel-identical embeds.** The embeds are re-created faithfully but are not
  diffed against the old ones.
- **Migrating the Go rewrite.** [`main`](https://github.com/bachtran02/MusicCat)
  is a separate Go implementation and is untouched.

### 4.1 What was cut, and where it went

The legacy bot's 18 commands became 10. Every cut is reachable another way — this
is a narrower surface, not a smaller product.

| Cut | Still available as |
|---|---|
| `/resume` | `/pause`, which toggles |
| `/stop` | `/leave`, which disconnects and clears |
| `/loop` | the `loop` option on `/play` and `/search` |
| `/shuffle` | the `shuffle` option on `/play` and `/search` |
| `/now` | the now-playing message, posted for every track |
| `/restart` | `/seek 0:00` |
| `/join` | `/play`, which connects on its own |

The player buttons went too. Loop and shuffle are consequently set at queueing
time rather than adjusted mid-track, which is the one behavioural change here.

**Stepping backwards through history is gone** — it was the previous button, it
had no command, and nothing replaces it. That is the only capability the trim
cost, and it is recoverable as a `/previous` command if it is missed.

## 5. Users

**The listener** — a member of a Discord server where MusicCat is installed.
Wants to hear a song without reading documentation. Interacts mostly through
`/play`; will never see a config file. Cares that autocomplete finds the right
track, that replies are quick, and that nothing needs re-typing.

**The operator** — whoever self-hosts the bot. Runs the container, holds the
Discord token and the Lavalink credentials, and is the only one who sees
`/stats` and `/info`. Cares that a misconfiguration fails loudly at boot rather
than at the first command, and that pointing at a different node is not a code
change.

## 6. User stories

| # | As a… | I want to… | So that… |
|---|---|---|---|
| US-1 | listener | queue a track by URL or by searching | I can play music without leaving Discord |
| US-2 | listener | see suggestions as I type a search | I get the track I meant, not the first match |
| US-3 | listener | search a specific source and result type | I can find a Spotify *album* rather than a track that shares its name |
| US-4 | listener | pause and skip without hunting for a control | the bot stays out of the way |
| US-5 | listener | see what's playing and what's next | I know whether to queue something |
| US-6 | listener | remove a track from the queue | one bad choice doesn't have to play |
| US-7 | listener | loop a track or the queue, and shuffle | the music continues without babysitting |
| US-8 | listener | queue a playlist and have it shuffled | I get variety without queueing tracks one by one |
| US-9 | listener | have playback pause when I deafen myself | I don't miss anything when I step away |
| US-10 | operator | configure the bot without editing code | I can deploy it against my own node |
| US-11 | operator | see node health | I can tell "the bot is broken" from "the node is down" |
| US-12 | operator | have bad config fail at startup | I find out at deploy, not from a user |

## 7. Functional requirements

Priority: **P0** ships or the release doesn't; **P1** expected; **P2** nice to
have. "Verified" names the automated test that covers it — `manual` means it
needs a live Discord and Lavalink node.

### Playback

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-1 | `/play` accepts a track URL, a playlist URL, or a search query, and defaults to searching YouTube | P0 | `test_service` |
| FR-2 | `/play` and `/search` take `next`, `loop` and `shuffle` as **boolean** options | P0 | offline command render |
| FR-3 | `next` queues a single track at the front of the queue | P1 | `test_service` |
| FR-4 | `loop` on a single result loops that track; on a playlist it loops the queue | P0 | `test_service` |
| FR-5 | A playlist is shuffled as it is queued, unless `shuffle` is false | P1 | `test_service` |
| FR-6 | Queued tracks remember the playlist they came from, including its link when the query was one | P1 | `test_service` |
| FR-7 | Queueing joins the caller's voice channel if the bot is not already connected | P0 | manual |
| FR-8 | A query that matches nothing, or fails to load, replies with the reason and queues nothing | P0 | `test_service` |

### Search

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-9 | `/search` autocompletes the query as the user types | P0 | manual |
| FR-10 | `/search` takes a `source` (YouTube, Spotify, Deezer) and a `type` (track, artist, album, playlist) | P0 | offline command render |
| FR-11 | On Spotify and Deezer, autocomplete returns artists, albums and playlists as well as tracks, each visually distinguished | P1 | `test_search` |
| FR-12 | With no `type`, results are balanced across the four types; with one, that type fills the list | P2 | — |
| FR-13 | Autocomplete never surfaces an error to the user — a failed lookup returns no suggestions | P0 | `test_search` |

### Player controls

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-14 | `/skip` plays the next track and names the one it replaced; `/pause` toggles | P0 | `test_player` |
| FR-15 | `/seek` accepts `mm:ss` and `hh:mm:ss`, and rejects anything else with a usable message | P1 | `test_formatting` |
| FR-16 | `/seek` refuses tracks that are not seekable | P1 | manual |
| FR-17 | `/play loop:true` loops the track, or the queue for a playlist — and **track means track** | P0 | `test_service` |
| FR-18 | `/play shuffle:true` shuffles a playlist as it is queued | P1 | `test_service` |
| FR-19 | `/effects` applies Bass Boost or Nightcore, or clears effects; applying one replaces the other | P1 | manual |
| FR-20 | `/leave` clears the queue, loop and shuffle, and takes down the now-playing message | P0 | `test_player` |

### The now-playing message

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-21 | A message describing the track is posted when a track starts, in the channel the last queueing command came from | P0 | `test_events` |
| FR-22 | Exactly one such message exists per guild — a new track deletes the previous one | P0 | `test_events` |
| FR-23 | The message is deleted when the queue ends or playback is stopped | P0 | `test_events` |

### Queue

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-30 | `/queue` shows the current track and the next 10 | P0 | manual |
| FR-31 | `/remove` autocompletes from the live queue and removes by position | P1 | manual |
| FR-32 | `/queue` does not require voice channel membership | P2 | offline command render |

### Voice

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-33 | `/play` connects to the caller's channel when the bot is not already in one | P0 | manual |
| FR-34 | `/leave` disconnects and clears the player | P0 | manual |
| FR-35 | When one member is listening, their deafening pauses playback and undeafening resumes it | P1 | manual |
| FR-36 | The bot leaves once it is alone in the channel | P1 | manual |
| FR-37 | Being disconnected externally clears the player, even if the node is unreachable | P1 | `test_player` |

### Operation

| ID | Requirement | Pri | Verified |
|---|---|---|---|
| FR-38 | All configuration comes from the environment; nothing is hardcoded | P0 | `test_config` |
| FR-39 | Invalid configuration fails at startup, naming the variable | P0 | `test_config` |
| FR-40 | More than one Lavalink node can be configured, inheriting shared settings | P2 | `test_config` |
| FR-41 | Commands can be registered to named guilds for instant updates during development | P1 | offline command render |
| FR-42 | `/stats` and `/info` report node health, and are owner-only | P1 | offline command render |
| FR-43 | Command replies delete themselves after a configurable delay | P2 | manual |
| FR-44 | A failed command replies with the reason, ephemerally, and logs the rest | P0 | manual |

## 8. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Python 3.10 through 3.14 |
| NFR-2 | Deployable as `docker compose up` with the node alongside, gated on the node's health check |
| NFR-3 | No database, no queue, no worker, no scheduled process |
| NFR-4 | Secrets only via environment; none committed. `.env` and the node's `application.yml` are ignored |
| NFR-5 | Structured logging to console; optional rotating files, including a dedicated track log |
| NFR-6 | The test suite runs offline in under 5 seconds |
| NFR-7 | Lint and format enforced by a single tool (`ruff`) with the configuration committed |
| NFR-8 | A user-facing error never exposes a traceback |

## 9. Success metrics

| Metric | Target | How measured |
|---|---|---|
| Capability parity | Every legacy capability reachable via 11 commands, except stepping backwards | Offline render; §4.1 maps each cut |
| Known defects shipped | 0 of the 5 in §2 | Each has a test or a documented manual check |
| Dependencies on a pre-release or unmaintained version | 0 | `pyproject.toml` |
| Automated test coverage of pure logic | Every non-I/O module has tests | 92 tests at time of writing |
| Time for a new operator to first playback | < 15 minutes from clone | README walkthrough, unmeasured |
| Post-cutover regressions reported in the first week | 0 | User reports |

## 10. Release plan

| Milestone | Contents | State |
|---|---|---|
| **M1 — Port** | All four libraries current, commands registering, miru removed | Done |
| **M2 — Defects** | The five §2 defects fixed, each with a test where testable | Done |
| **M3 — Operability** | Environment configuration, Docker compose, README, node config example | Done |
| **M4 — Safety net** | Test suite, lint and format clean | Done — 92 tests |
| **M5 — Live verification** | First run against a test guild with `DEFAULT_GUILDS` set: every P0 walked through by hand | **Not started** |
| **M6 — Cutover** | Global command registration, legacy deployment retired | Not started |

M5 is the gate. Everything before it is verified offline only.

## 11. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Nothing has run against live Discord or Lavalink.** Offline checks verify shape, not behaviour | High | M5 walks every P0 by hand in a test guild before cutover |
| **YouTube playback breaks on YouTube's schedule, not ours.** youtube-source's latest commit is a client-version revert — the arms race is live | High | Not a stack decision: every backend fails the same week. Mitigated by consuming upstream fixes rather than maintaining them; `pot` and `oauth` are both documented in the node config |
| Plugin versions rot, and a stale client name silently degrades playback | Medium | Versions verified 2026-08-14 and dated in the config; the config warns against copying a client list from an older file |
| `/effects` needs `equalizer` and `timescale` filters, which are off in a stock Lavalink install | Medium | Both enabled in the example config, with a comment saying why |
| The lightbulb menu-detach workaround depends on `Menu.attach()` internals staying as they are | Low | Uses only documented API; a test asserts the detach, so an upgrade that breaks it fails the suite |
| Two `/play` commands within the same moment could skip a track, because `is_playing` is false until the node confirms the track started | Low | Pre-existing in the legacy bot; window is milliseconds; not worth a lock |
| ~~Custom emoji belong to one Discord application~~ | ~~Low~~ | **Closed.** Eight of the eleven went with the buttons; the three the embed still draws with are Unicode |

## 12. Open questions

1. **Does the operator want CI?** A workflow running `ruff` and `pytest` on the
   test suite is roughly 20 lines and nothing depends on it.
2. **Should `/previous` exist as a command?** Stepping backwards was lost with
   the buttons and is the only capability the trim cost. The player's history and
   `play_previous` went with it, so restoring it is ~40 lines, not a one-liner.
3. **Where should this live long-term?** It currently sits in a subdirectory of a
   GitHub Pages repository, which is where it could be pushed — not where it
   belongs.
4. **Is `DEFAULT_GUILDS` wanted in production**, or only for development? Global
   registration is the default and takes up to an hour to propagate.

## Appendix — command reference

### Commands

| Command | Options | Checks |
|---|---|---|
| `/play` | `query` · `next` · `loop` · `shuffle` | guild, voice |
| `/search` | `query`* · `type` · `source` · `next` · `loop` · `shuffle` | guild, voice |
| `/pause` | — | guild, voice, playing |
| `/skip` | — | guild, voice, playing |
| `/seek` | `position` | guild, voice, playing |
| `/effects` | `effect` | guild, voice, playing |
| `/queue` | — | guild, playing |
| `/remove` | `track`* | guild, voice, playing |
| `/leave` | — | guild, voice, connected |
| `/stats` `/info` | — | owner |

\* autocompleted

### Buttons

There are none. The now-playing message carries no components.
