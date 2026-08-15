from __future__ import annotations

import pytest

from musiccat.formatting import PROGRESS_BAR_WIDTH
from musiccat.formatting import format_time
from musiccat.formatting import parse_time
from musiccat.formatting import progress_bar
from musiccat.formatting import trim


@pytest.mark.parametrize(
    ("milliseconds", "expected"),
    [
        (0, "0:00"),
        (1_500, "0:01"),
        (61_000, "1:01"),
        (3_600_000, "1:00:00"),
        (3_661_000, "1:01:01"),
        (90_000_000, "1:01:00:00"),
    ],
)
def test_format_time_picks_the_units_the_duration_needs(milliseconds: int, expected: str) -> None:
    assert format_time(milliseconds) == expected


def test_format_time_can_be_held_to_one_unit() -> None:
    assert format_time(90_000_000, "h") == "25:00:00"
    assert format_time(3_661_000, "m") == "61:01"


def test_parse_time_splits_a_duration() -> None:
    assert parse_time(90_061_000) == (1, 1, 1, 1)


def test_progress_bar_marks_where_playback_is() -> None:
    from musiccat.constants import EMOJI_RADIO_BUTTON

    assert progress_bar(0.0).startswith(EMOJI_RADIO_BUTTON)
    assert progress_bar(1.0).endswith(EMOJI_RADIO_BUTTON)
    assert progress_bar(0.5).startswith("▬" * (PROGRESS_BAR_WIDTH // 2) + EMOJI_RADIO_BUTTON)


@pytest.mark.parametrize("fraction", [-1.0, 0.0, 0.5, 1.0, 2.0])
def test_progress_bar_stays_in_bounds(fraction: float) -> None:
    bar = progress_bar(fraction)

    assert bar.count("▬") == PROGRESS_BAR_WIDTH - 1


def test_trim_only_shortens_what_is_too_long() -> None:
    assert trim("short", 10) == "short"
    assert trim("a very long title indeed", 10) == "a very ..."
    assert len(trim("a very long title indeed", 10)) == 10
