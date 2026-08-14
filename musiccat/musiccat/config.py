"""Runtime configuration, resolved from the environment."""

from __future__ import annotations

import dataclasses
import json
import os
from collections.abc import Mapping
from collections.abc import Sequence


class ConfigError(RuntimeError):
    """Raised when the environment does not describe a usable configuration."""


@dataclasses.dataclass(frozen=True, slots=True)
class NodeConfig:
    """Connection details for a single Lavalink node."""

    name: str
    host: str
    port: int
    password: str
    region: str
    ssl: bool = False

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, object], *, fallback: NodeConfig) -> NodeConfig:
        """Build a node config from a mapping, filling absent keys from ``fallback``."""
        return cls(
            name=str(mapping.get("name", fallback.name)),
            host=str(mapping.get("host", fallback.host)),
            port=int(mapping.get("port", fallback.port)),  # type: ignore[arg-type]
            password=str(mapping.get("password", fallback.password)),
            region=str(mapping.get("region", fallback.region)),
            ssl=bool(mapping.get("ssl", fallback.ssl)),
        )


@dataclasses.dataclass(frozen=True, slots=True)
class Config:
    """Everything the bot needs to know before it connects to anything."""

    token: str
    nodes: tuple[NodeConfig, ...]
    default_guilds: tuple[int, ...]
    delete_after: float
    log_level: str
    log_dir: str | None

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> Config:
        """
        Resolve the configuration from environment variables.

        Raises:
            ConfigError: If a required variable is missing, or a variable holds a value of the wrong shape.
        """
        env = os.environ if env is None else env

        token = env.get("DISCORD_TOKEN") or env.get("TOKEN")
        if not token:
            raise ConfigError("'DISCORD_TOKEN' is not set - the bot cannot log in without a token")

        default_node = NodeConfig(
            name=env.get("LAVALINK_NODE_NAME", "default-node"),
            host=env.get("LAVALINK_HOST", "lavalink"),
            port=_int(env, "LAVALINK_PORT", 2333),
            password=env.get("LAVALINK_PASSWORD", "youshallnotpass"),
            region=env.get("LAVALINK_REGION", "eu"),
            ssl=_bool(env, "LAVALINK_SSL", default=False),
        )

        return cls(
            token=token,
            nodes=_nodes(env, fallback=default_node),
            default_guilds=_guild_ids(env),
            delete_after=_float(env, "DELETE_AFTER", 60.0),
            log_level=env.get("LOG_LEVEL", "INFO").upper(),
            log_dir=env.get("LOG_DIR") or None,
        )


def _nodes(env: Mapping[str, str], *, fallback: NodeConfig) -> tuple[NodeConfig, ...]:
    """Parse ``LAVALINK_NODES`` - a JSON array of partial node objects - falling back to a single node."""
    raw = env.get("LAVALINK_NODES")
    if not raw:
        return (fallback,)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ConfigError(f"'LAVALINK_NODES' is not valid JSON: {e}") from e

    if not isinstance(parsed, Sequence) or isinstance(parsed, (str, bytes)) or not parsed:
        raise ConfigError("'LAVALINK_NODES' must be a non-empty JSON array of node objects")

    nodes = []
    for i, item in enumerate(parsed):
        if not isinstance(item, Mapping):
            raise ConfigError(f"'LAVALINK_NODES[{i}]' must be a JSON object")
        try:
            nodes.append(NodeConfig.from_mapping(item, fallback=fallback))
        except (TypeError, ValueError) as e:
            raise ConfigError(f"'LAVALINK_NODES[{i}]' holds an invalid value: {e}") from e

    return tuple(nodes)


def _guild_ids(env: Mapping[str, str]) -> tuple[int, ...]:
    """Parse ``DEFAULT_GUILDS`` - a comma separated list of guild IDs to register commands in."""
    raw = env.get("DEFAULT_GUILDS", "").strip()
    if not raw:
        return ()

    try:
        return tuple(int(part) for part in raw.split(",") if part.strip())
    except ValueError as e:
        raise ConfigError(f"'DEFAULT_GUILDS' must be a comma separated list of guild IDs: {e}") from e


def _int(env: Mapping[str, str], key: str, default: int) -> int:
    raw = env.get(key)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError as e:
        raise ConfigError(f"{key!r} must be an integer, got {raw!r}") from e


def _float(env: Mapping[str, str], key: str, default: float) -> float:
    raw = env.get(key)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError as e:
        raise ConfigError(f"{key!r} must be a number, got {raw!r}") from e


def _bool(env: Mapping[str, str], key: str, *, default: bool) -> bool:
    raw = env.get(key)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")
