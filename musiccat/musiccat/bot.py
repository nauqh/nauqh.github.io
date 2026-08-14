"""Wiring: the hikari bot, the lightbulb client, and the Lavalink client they share."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat import errors
from musiccat import log_config
from musiccat import responses
from musiccat.config import Config
from musiccat.events import LavalinkEventHandler
from musiccat.extensions import EXTENSIONS
from musiccat.player import MusicCatPlayer

LOGGER = logging.getLogger(__name__)
COMMAND_LOGGER = logging.getLogger("musiccat.command")

INTENTS = hikari.Intents.GUILDS | hikari.Intents.GUILD_VOICE_STATES


@lightbulb.hook(lightbulb.ExecutionSteps.PRE_INVOKE)
def log_invocation(_: lightbulb.ExecutionPipeline, ctx: lightbulb.Context) -> None:
    """Record every command that makes it past its checks."""
    COMMAND_LOGGER.info(
        "'/%s' invoked by '%s' on guild %s",
        ctx.command_data.qualified_name,
        ctx.user.username,
        ctx.guild_id,
    )


def build(config: Config) -> hikari.GatewayBot:
    """
    Build the bot, and everything hanging off it.

    The Lavalink client can only be created once Discord has told us the bot's own user ID,
    so the rest of the setup happens when the bot reports that it has started.
    """
    bot = hikari.GatewayBot(config.token, intents=INTENTS, banner=None, logs=None)
    client = lightbulb.client_from_app(bot, default_enabled_guilds=config.default_guilds, hooks=[log_invocation])

    responses.configure(config.delete_after)
    lavalink_client: lavalink.Client | None = None

    @client.error_handler
    async def on_error(exc: lightbulb.exceptions.ExecutionPipelineFailedException) -> bool:
        return await handle_command_error(exc)

    @bot.listen(hikari.StartedEvent)
    async def on_started(_: hikari.StartedEvent) -> None:
        nonlocal lavalink_client

        me = bot.get_me()
        assert me is not None, "the bot must know its own user before Lavalink can be set up"

        lavalink_client = build_lavalink_client(config, me.id)
        lavalink_client.add_event_hooks(LavalinkEventHandler(bot, client))

        # Registered before the first command runs, which is the last moment the DI registry
        # is still open for writes.
        client.di.registry_for(lightbulb.di.Contexts.DEFAULT).register_value(lavalink.Client, lavalink_client)
        client.di.registry_for(lightbulb.di.Contexts.DEFAULT).register_value(Config, config)

        await client.load_extensions(*EXTENSIONS)
        await client.start()

    @bot.listen(hikari.StoppingEvent)
    async def on_stopping(_: hikari.StoppingEvent) -> None:
        if lavalink_client is not None:
            await lavalink_client.close()
            LOGGER.info("Closed the Lavalink client")

    return bot


def build_lavalink_client(config: Config, user_id: hikari.Snowflake) -> lavalink.Client:
    """Create the Lavalink client and connect it to every configured node."""
    lavalink_client: lavalink.Client = lavalink.Client(user_id=int(user_id), player=MusicCatPlayer)

    for node in config.nodes:
        lavalink_client.add_node(
            host=node.host,
            port=node.port,
            password=node.password,
            region=node.region,
            name=node.name,
            ssl=node.ssl,
        )
        LOGGER.info("Registered Lavalink node %r at %s:%s", node.name, node.host, node.port)

    return lavalink_client


async def handle_command_error(exc: lightbulb.exceptions.ExecutionPipelineFailedException) -> bool:
    """
    Turn a failed command into an ephemeral reply.

    Returns:
        Whether the failure was handled. Unhandled failures are re-raised by lightbulb and
        end up in the logs.
    """
    context = exc.context
    causes = exc.causes or ([exc.__cause__] if isinstance(exc.__cause__, Exception) else [])
    cause = causes[0] if causes else None

    expected = next((c for c in causes if isinstance(c, errors.MusicCatError)), None)
    if expected is not None:
        await _reply(context, expected.message)
        return True

    if any(isinstance(c, lightbulb.prefab.NotOwner) for c in causes):
        await _reply(context, "That command is only for the bot's owner.")
        return True

    LOGGER.error(
        "Command %r failed on guild %s",
        context.command_data.qualified_name,
        context.guild_id,
        exc_info=(type(cause), cause, cause.__traceback__) if cause is not None else None,
    )
    await _reply(context, "Something went wrong running that command.")
    return True


async def _reply(context: lightbulb.Context, message: str) -> None:
    try:
        await context.respond(message, ephemeral=True)
    except hikari.HikariError as e:
        LOGGER.warning("Failed to report a command error to the user: %s", e)


def run() -> None:
    """Load the configuration and run the bot until it is stopped."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        pass
    else:
        load_dotenv()

    config = Config.from_env()
    log_config.configure(config.log_level, config.log_dir)

    build(config).run()
