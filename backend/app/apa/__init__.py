"""Perfiles APA y formateador de documentos Word."""

from .formatter import apply_profile
from .profiles import (
    ApaProfile,
    HeadingStyle,
    describe_rules,
    get_profile,
    list_profiles,
)

__all__ = [
    "ApaProfile",
    "HeadingStyle",
    "apply_profile",
    "describe_rules",
    "get_profile",
    "list_profiles",
]
