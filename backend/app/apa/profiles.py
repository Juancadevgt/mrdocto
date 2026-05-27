"""Perfiles de formato APA (ediciones 7, 6 y 5).

Cada perfil describe las reglas de formato que el formateador aplica a un
documento Word. No existe una fuente oficial consultable de la APA: las normas
son un manual publicado, asi que se modelan aqui como datos versionados. Cuando
salga una edicion nueva, basta con anadir otro `ApaProfile` a `_PROFILES`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class HeadingStyle:
    """Formato de un nivel de titulo APA (1 a 5)."""

    level: int
    bold: bool
    italic: bool
    alignment: str  # "left" | "center"
    # Niveles 4-5: el texto del parrafo continua en la misma linea que el titulo.
    inline: bool


@dataclass(frozen=True)
class ApaProfile:
    """Conjunto de reglas de formato de una edicion APA."""

    id: str
    label: str
    edition: int
    year: int
    font_name: str
    font_size_pt: float
    line_spacing: float
    margin_in: float
    first_line_indent_in: float
    body_alignment: str  # "left" recomendado por APA
    references_title_bold: bool
    references_title_alignment: str
    hanging_indent_in: float
    headings: List[HeadingStyle] = field(default_factory=list)
    notes: str = ""


# Titulos de nivel para la 7a edicion (formato bien definido en el manual 2019).
_APA7_HEADINGS: List[HeadingStyle] = [
    HeadingStyle(1, bold=True, italic=False, alignment="center", inline=False),
    HeadingStyle(2, bold=True, italic=False, alignment="left", inline=False),
    HeadingStyle(3, bold=True, italic=True, alignment="left", inline=False),
    HeadingStyle(4, bold=True, italic=False, alignment="left", inline=True),
    HeadingStyle(5, bold=True, italic=True, alignment="left", inline=True),
]

# Para 6a y 5a edicion los titulos son una aproximacion cercana; el cuerpo
# (fuente, interlineado, margenes, sangria) si es exacto. Se afinan despues.
_APA6_HEADINGS: List[HeadingStyle] = [
    HeadingStyle(1, bold=False, italic=False, alignment="center", inline=False),
    HeadingStyle(2, bold=True, italic=False, alignment="center", inline=False),
    HeadingStyle(3, bold=True, italic=False, alignment="left", inline=False),
    HeadingStyle(4, bold=True, italic=True, alignment="left", inline=False),
    HeadingStyle(5, bold=False, italic=True, alignment="left", inline=False),
]


_PROFILES: dict[str, ApaProfile] = {
    "apa7": ApaProfile(
        id="apa7",
        label="APA 7a edicion (2019)",
        edition=7,
        year=2019,
        font_name="Times New Roman",
        font_size_pt=12.0,
        line_spacing=2.0,
        margin_in=1.0,
        first_line_indent_in=0.5,
        body_alignment="left",
        references_title_bold=True,
        references_title_alignment="center",
        hanging_indent_in=0.5,
        headings=_APA7_HEADINGS,
        notes=(
            "Edicion vigente. Fuente por defecto Times New Roman 12 (APA 7 "
            "tambien admite Calibri 11, Arial 11, Georgia 11). Titulo de "
            "Referencias centrado y en negrita."
        ),
    ),
    "apa6": ApaProfile(
        id="apa6",
        label="APA 6a edicion (2009)",
        edition=6,
        year=2009,
        font_name="Times New Roman",
        font_size_pt=12.0,
        line_spacing=2.0,
        margin_in=1.0,
        first_line_indent_in=0.5,
        body_alignment="left",
        references_title_bold=False,
        references_title_alignment="center",
        hanging_indent_in=0.5,
        headings=_APA6_HEADINGS,
        notes=(
            "Edicion anterior. Times New Roman 12. Titulo de Referencias "
            "centrado y SIN negrita. Niveles de titulo aproximados."
        ),
    ),
    "apa5": ApaProfile(
        id="apa5",
        label="APA 5a edicion (2001)",
        edition=5,
        year=2001,
        font_name="Times New Roman",
        font_size_pt=12.0,
        line_spacing=2.0,
        margin_in=1.0,
        first_line_indent_in=0.5,
        body_alignment="left",
        references_title_bold=False,
        references_title_alignment="center",
        hanging_indent_in=0.5,
        headings=_APA6_HEADINGS,
        notes=(
            "Edicion poco usada hoy. Times New Roman 12. Titulo de Referencias "
            "centrado y SIN negrita. Niveles de titulo aproximados."
        ),
    ),
}


def list_profiles() -> List[ApaProfile]:
    """Perfiles disponibles, ordenados de mas reciente a mas antiguo."""
    return sorted(_PROFILES.values(), key=lambda p: p.edition, reverse=True)


def get_profile(profile_id: str) -> Optional[ApaProfile]:
    """Devuelve un perfil por su id (p. ej. "apa7") o None si no existe."""
    return _PROFILES.get(profile_id)
