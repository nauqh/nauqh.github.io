# MusicCat

A Discord music streaming bot built with [hikari](https://www.hikari-py.dev/),
[lightbulb](https://github.com/tandemdude/hikari-lightbulb) and
[Lavalink](https://github.com/lavalink-devs/Lavalink).

This is a rewrite of the [`legacy-python` branch of bachtran02/MusicCat](https://github.com/bachtran02/MusicCat/tree/legacy-python)
on the current generation of those libraries: hikari 2.5, lightbulb 3.2 and Lavalink.py 5.11.

## Features

* Slash commands, with autocompletion on `/search` and `/remove`.
* An interactive player message: previous, pause/resume, next, loop, shuffle and stop, posted
  each time a track starts and taken down when the queue runs out.
* `/search` looks queries up per source and per type (track, artist, album, playlist) through the
  [LavaSearch](https://github.com/topi314/LavaSearch) plugin.
* `/effects` applies Nightcore or Bass Boost.
* When one person is listening, Discord's deafen 🎧 pauses playback and undeafening resumes it.
  The bot leaves once it is alone in the channel.
* Sources are whatever the node's plugins provide - see `lavalink/application.yml.example` for the
  YouTube, Spotify and Deezer setup this was written against.

### Commands

| Group    | Commands                                                       |
| -------- | -------------------------------------------------------------- |
| Playback | `/play` `/search`                                               |
| Control  | `/pause` `/resume` `/skip` `/stop` `/seek` `/restart`           |
| Queue    | `/now` `/queue` `/remove` `/shuffle` `/loop`                    |
| Effects  | `/effects`                                                      |
| Voice    | `/join` `/leave`                                                |
| Owner    | `/stats` `/info`                                                |

## Running it

### With Docker

```sh
cp .env.example .env                                        # then fill in DISCORD_TOKEN
cp lavalink/application.yml.example lavalink/application.yml  # then fill in your plugin credentials
docker compose up -d
```

The compose file runs a Lavalink node alongside the bot and points the bot at it.

### Locally

You need a Lavalink v4 node to talk to - either the one from `docker compose up lavalink`, or
your own.

```sh
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env  # then fill in DISCORD_TOKEN and LAVALINK_HOST
python -m musiccat
```

## Configuration

Everything is read from the environment (a `.env` file is loaded if one is present).

| Variable             | Default            | Meaning                                                        |
| -------------------- | ------------------ | -------------------------------------------------------------- |
| `DISCORD_TOKEN`      | *required*         | The bot token.                                                  |
| `LAVALINK_HOST`      | `lavalink`         | Node hostname.                                                  |
| `LAVALINK_PORT`      | `2333`             | Node port.                                                      |
| `LAVALINK_PASSWORD`  | `youshallnotpass`  | Node password.                                                  |
| `LAVALINK_REGION`    | `eu`               | Region the node is assigned to.                                 |
| `LAVALINK_SSL`       | `false`            | Use `wss`/`https` to reach the node.                            |
| `LAVALINK_NODE_NAME` | `default-node`     | Name the node shows up as in logs and `/stats`.                 |
| `LAVALINK_NODES`     | unset              | JSON array of node objects, for running more than one node.     |
| `DEFAULT_GUILDS`     | unset              | Comma separated guild IDs to register commands in. Global if unset. |
| `DELETE_AFTER`       | `60`               | Seconds before command replies clean themselves up. `0` keeps them. |
| `LOG_LEVEL`          | `INFO`             | Log level for the bot's own loggers.                            |
| `LOG_DIR`            | unset              | Write rotating `bot.log` and `track.log` files here.            |

`LAVALINK_NODES` takes partial objects - anything left out falls back to the single-node
variables above:

```sh
LAVALINK_NODES='[{"name": "eu-1", "region": "eu"}, {"name": "us-1", "host": "10.0.0.4", "region": "us"}]'
```

Registering commands to `DEFAULT_GUILDS` while developing avoids the hour-long propagation delay
that global commands have.

## Layout

```
musiccat/
├── bot.py          entrypoint: hikari bot, lightbulb client, Lavalink client
├── config.py       configuration read from the environment
├── service.py      joining voice, resolving queries, filling the queue
├── player.py       MusicCatPlayer - queue history and the now-playing message
├── events.py       Lavalink events -> the now-playing message
├── ui.py           the player message's buttons
├── hooks.py        command checks
├── search.py       LavaSearch client
├── embeds.py       embed builders
└── extensions/     the slash commands
```

## Notes on the rewrite

The libraries this was built on all changed shape since the legacy version:

* **lightbulb 2 → 3.** `BotApp`, plugins and the decorator stack are gone. Commands are classes,
  checks are execution hooks, and `bot.d` is replaced by dependency injection - the Lavalink
  client and config are registered on the client's DI registry and injected into commands.
* **hikari-miru is no longer needed.** Lightbulb 3 ships its own component menus, so the player
  message's buttons are `lightbulb.components.Menu` and there is one less dependency.
* **Lavalink.py 5.1 → 5.11.** `Client._dispatch_event` is synchronous now, `AudioTrack.stream` was
  renamed `is_stream`, nodes take a required region, and `Node.request` is public - so the
  LavaSearch call no longer reaches into `node._transport._request`.
* `delete_after` on responses no longer exists in lightbulb, so self-deleting replies are
  scheduled in `responses.py`.
* Boolean options replaced `choices=['True']` strings parsed with `eval`.
* Loop modes now use Lavalink's own constants (`LOOP_SINGLE = 1`, `LOOP_QUEUE = 2`); the legacy
  player defined them the other way round, so `/loop track` looped the queue.
* Configuration comes from the environment rather than being hardcoded in `config.py`.

---

Original project by [bachtran02](https://github.com/bachtran02/MusicCat), inspired by
[Ashema](https://github.com/nauqh/Ashema) in collaboration with [Nauqh](https://github.com/nauqh).
