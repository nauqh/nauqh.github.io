"""Owner-only commands for looking at the Lavalink nodes."""

from __future__ import annotations

import logging

import hikari
import lavalink
import lightbulb

from musiccat.formatting import format_time

LOGGER = logging.getLogger(__name__)

loader = lightbulb.Loader()


@loader.command
class Stats(
    lightbulb.SlashCommand,
    name="stats",
    description="Show Lavalink node statistics",
    hooks=[lightbulb.prefab.owner_only],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        nodes = lavalink_client.node_manager.nodes

        body = "**Nodes:**\n"
        if nodes:
            for i, node in enumerate(nodes, start=1):
                availability = "available" if node.available else "unavailable"
                body += f"{i}. `{node.name} [{node.region}] - {availability}`\n"
        else:
            body += "No nodes configured\n"

        body += "\n**Lavalink stats:**\n"
        stats = nodes[0].stats if nodes else None

        if stats is not None and not stats.is_fake:
            memory_percent = round(100 * stats.memory_used / stats.memory_allocated) if stats.memory_allocated else 0
            body += (
                f"Uptime: `{format_time(stats.uptime, 'd')}`\n"
                f"Players: `{stats.players} ({stats.playing_players} playing)`\n"
                f"Memory: `{round(stats.memory_used / 1e6)} MB ({memory_percent}%)`\n"
                f"Lavalink load: `{round(stats.lavalink_load * 100, 2)}%`\n"
                f"System load: `{round(stats.system_load * 100, 2)}%`\n"
                f"Frames sent: `{stats.frames_sent}`\n"
            )
        else:
            body += "No stats available\n"

        await ctx.respond(embed=hikari.Embed(title="📊 Lavalink Stats", description=body), ephemeral=True)


@loader.command
class Info(
    lightbulb.SlashCommand,
    name="info",
    description="Show Lavalink node info",
    hooks=[lightbulb.prefab.owner_only],
):
    @lightbulb.invoke
    async def invoke(self, ctx: lightbulb.Context, lavalink_client: lavalink.Client = lightbulb.di.INJECTED) -> None:
        nodes = lavalink_client.node_manager.nodes
        if not nodes:
            await ctx.respond(embed=hikari.Embed(title="📊 Lavalink Info", description="No nodes configured"))
            return

        try:
            info = await nodes[0].get_info()
        except lavalink.LavalinkError as e:
            LOGGER.warning("Failed to fetch info from node %r: %s", nodes[0].name, e)
            await ctx.respond(embed=hikari.Embed(title="📊 Lavalink Info", description=f"Node unreachable: {e}"))
            return

        body = "".join(f"- {key}: `{value}`\n" for key, value in info.items())
        await ctx.respond(embed=hikari.Embed(title="📊 Lavalink Info", description=body), ephemeral=True)
