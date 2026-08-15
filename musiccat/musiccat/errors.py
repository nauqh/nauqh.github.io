"""Errors raised by command checks and player operations.

Every error carries a message that is safe to show to the user - the error handler in
`musiccat.bot` replies with it verbatim.
"""

from __future__ import annotations


class MusicCatError(Exception):
    """Base class for errors with a user-facing message."""

    default_message = "Something went wrong."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class GuildOnly(MusicCatError):
    default_message = "This command can only be used in a server."


class NotInVoice(MusicCatError):
    default_message = "Join a voice channel to use this command."


class NotSameVoice(MusicCatError):
    default_message = "Join the same voice channel as the bot to use this command."


class PlayerNotConnected(MusicCatError):
    default_message = "The bot is not in a voice channel."


class PlayerNotPlaying(MusicCatError):
    default_message = "Nothing is playing right now."


class NoResults(MusicCatError):
    default_message = "No results for that query."


class NoNodesAvailable(MusicCatError):
    default_message = "No Lavalink node is available - try again in a moment."
