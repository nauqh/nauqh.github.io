from __future__ import annotations

import pytest

from musiccat.config import Config
from musiccat.config import ConfigError

MINIMAL = {"DISCORD_TOKEN": "token"}


def test_defaults_need_only_a_token() -> None:
    config = Config.from_env(MINIMAL)

    assert config.token == "token"
    assert config.default_guilds == ()
    assert config.delete_after == 60.0
    assert config.log_dir is None

    (node,) = config.nodes
    assert (node.name, node.host, node.port, node.password) == ("default-node", "lavalink", 2333, "youshallnotpass")
    assert node.ssl is False


def test_legacy_token_variable_still_works() -> None:
    assert Config.from_env({"TOKEN": "legacy"}).token == "legacy"


def test_a_missing_token_is_an_error() -> None:
    with pytest.raises(ConfigError, match="DISCORD_TOKEN"):
        Config.from_env({})


def test_node_settings_come_from_the_environment() -> None:
    config = Config.from_env(
        MINIMAL | {"LAVALINK_HOST": "audio.example.com", "LAVALINK_PORT": "443", "LAVALINK_SSL": "true"}
    )

    (node,) = config.nodes
    assert (node.host, node.port, node.ssl) == ("audio.example.com", 443, True)


def test_multiple_nodes_inherit_the_single_node_settings() -> None:
    config = Config.from_env(
        MINIMAL
        | {
            "LAVALINK_PASSWORD": "shared",
            "LAVALINK_NODES": '[{"name": "eu-1", "region": "eu"}, {"name": "us-1", "host": "10.0.0.4"}]',
        }
    )

    first, second = config.nodes
    assert (first.name, first.region, first.password) == ("eu-1", "eu", "shared")
    assert (second.name, second.host, second.password) == ("us-1", "10.0.0.4", "shared")


@pytest.mark.parametrize("nodes", ["not json", "{}", "[]", "[1, 2]"])
def test_malformed_node_lists_are_rejected(nodes: str) -> None:
    with pytest.raises(ConfigError, match="LAVALINK_NODES"):
        Config.from_env(MINIMAL | {"LAVALINK_NODES": nodes})


def test_guild_ids_are_parsed_into_ints() -> None:
    config = Config.from_env(MINIMAL | {"DEFAULT_GUILDS": "123, 456 ,"})

    assert config.default_guilds == (123, 456)


def test_unparseable_guild_ids_are_rejected() -> None:
    with pytest.raises(ConfigError, match="DEFAULT_GUILDS"):
        Config.from_env(MINIMAL | {"DEFAULT_GUILDS": "not-an-id"})


def test_a_non_numeric_port_is_rejected() -> None:
    with pytest.raises(ConfigError, match="LAVALINK_PORT"):
        Config.from_env(MINIMAL | {"LAVALINK_PORT": "http"})


def test_blank_values_fall_back_to_the_defaults() -> None:
    config = Config.from_env(MINIMAL | {"LAVALINK_PORT": "", "DELETE_AFTER": "", "DEFAULT_GUILDS": " "})

    assert config.nodes[0].port == 2333
    assert config.delete_after == 60.0
    assert config.default_guilds == ()
