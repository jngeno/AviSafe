"""
Accident-category labelling for AviSafe.

The source NTSB export (data/NTSB.csv) carries no explicit accident-category
column, so this module derives CFIT / LOC-I / Runway Excursion labels from
the free-text "Analysis" narrative field via rule-based keyword matching,
consistent with the narrative-text labelling approaches surveyed in the
AviSafe literature review (e.g. NER + causal modelling from CFIT narratives).

Rows whose narrative matches none of the three categories are left
unlabelled (NaN) and are expected to be dropped before training a
category-specific classifier -- this pipeline targets the three ICAO/IATA
high-risk categories specifically, not general accident causation.
"""

from __future__ import annotations

import pandas as pd

from src.core.logger import LoggerManager

# Patterns are listed lowest-priority first: each is applied with
# Series.mask(), so a later entry overwrites an earlier match on the
# same row. Runway Excursion is applied last (highest priority) because
# it names a specific, unambiguous physical outcome. LOC-I is applied
# after CFIT because CFIT by definition requires the aircraft to be
# under control -- if "loss of control" / "stall" / "spin" language is
# present, the event is LOC-I even when terrain is also mentioned
# (e.g. "lost control ... collided with terrain" is LOC-I, not CFIT).
_PATTERNS: dict[str, str] = {
    "CFIT": (
        r"controlled flight into (?:the )?terrain"
        r"|flew into (?:the )?terrain"
        r"|flew into (?:the )?trees"
        r"|flew into (?:rising|mountainous|rocky) terrain"
        r"|collided with (?:mountainous |rising )?terrain"
        r"|premature descent"
        r"|descended (?:below|through) (?:the )?(?:minimum descent altitude|glide ?path|glideslope)"
        r"|(?:unaware|not aware) of (?:the )?(?:aircraft'?s )?proximity to (?:the )?terrain"
        r"|failed to maintain (?:adequate |sufficient )?terrain clearance"
        r"|inadvertent(?:ly)? (?:flew|descended) into (?:the )?terrain"
    ),
    "LOC-I": (
        r"loss of control"
        r"|lost control"
        r"|aerodynamic stall"
        r"|aerodynamic upset"
        r"|stall/spin"
        r"|entered a spin"
        r"|spatial disorientation"
        r"|departed controlled flight"
        r"|unusual attitude"
        r"|uncontrolled (?:roll|descent|dive|turn)"
    ),
    "Runway Excursion": (
        r"runway excursion"
        r"|veered off the runway"
        r"|departed the (?:left |right |paved )?(?:side of the )?runway"
        r"|ran off the (?:end of the )?runway"
        r"|overran the runway"
        r"|excursion (?:from|off) the runway"
        r"|departed the (?:departure|approach) end of the runway"
        r"|exited the (?:side of the )?runway"
        r"|departed the runway surface"
    ),
}

# CFIT by definition requires an airworthy, normally-functioning aircraft
# flown into terrain -- not one brought down by a mechanical/power
# problem. Spot-checking the raw CFIT pattern against sample narratives
# found it firing on engine-failure forced landings that happened to
# strike terrain; those aren't CFIT, so rows mentioning these are
# excluded from the CFIT match regardless of terrain language.
_MECHANICAL_FAILURE_PATTERN = (
    r"loss of (?:engine )?power"
    r"|engine (?:lost|lose|losing) power"
    r"|lost (?:engine )?power"
    r"|engine failure"
    r"|engine malfunction"
    r"|fuel exhaustion"
    r"|fuel starvation"
    r"|forced landing"
    r"|partial loss of power"
    r"|total loss of power"
    r"|mechanical (?:failure|malfunction)"
)


class AccidentCategoryLabeler:
    """
    Assigns CFIT / LOC-I / Runway Excursion labels from narrative text.
    """

    def __init__(self, text_column: str = "Analysis") -> None:
        self.text_column = text_column
        self.logger = LoggerManager.get_logger(__name__)

    def label(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        Add an ``Accident_Category`` column derived from narrative text.

        Rows whose narrative matches none of the three categories are
        labelled NaN and should be dropped before training a
        category-specific classifier.
        """

        if self.text_column not in dataframe.columns:
            raise KeyError(
                f"'{self.text_column}' column not found; cannot derive "
                "accident-category labels."
            )

        dataframe = dataframe.copy()

        text = dataframe[self.text_column].fillna("")

        mechanical_failure = text.str.contains(
            _MECHANICAL_FAILURE_PATTERN, case=False, regex=True, na=False
        )

        category = pd.Series(
            [None] * len(dataframe),
            index=dataframe.index,
            dtype=object,
        )

        for name, pattern in _PATTERNS.items():

            matched = text.str.contains(pattern, case=False, regex=True, na=False)

            if name == "CFIT":
                matched = matched & ~mechanical_failure

            category = category.mask(matched, name)

        dataframe["Accident_Category"] = category

        counts = dataframe["Accident_Category"].value_counts(dropna=False)

        self.logger.info(
            "Accident category label counts: %s",
            counts.to_dict(),
        )

        return dataframe
