"""Best-effort destination guess from a free-text trip name.

Mirror of the frontend's ``deriveDestination`` (app/src/domain/cover/
deriveDestination.ts). Both must agree: the app asks ``/cover`` with the
derived destination, and the share/OG metadata resolves the image the same
way — otherwise a shared link would preview a different photo than the one
the trip actually shows.
"""

import re

_MONTHS = {
    # es
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "setiembre", "octubre", "noviembre", "diciembre",
    # en (full + common abbreviations)
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct",
    "nov", "dec",
}

_FILLER = {
    "en", "de", "del", "la", "el", "los", "las", "a",
    "trip", "viaje", "to", "the", "of", "in",
}

_YEAR = re.compile(r"^\d{4}$")
_PUNCT = re.compile(r"[.,;:]")


def derive_destination(name: str) -> str:
    """"Roma en julio" -> "Roma"; "Málaga 2026" -> "Málaga"."""
    kept = []
    for token in name.strip().split():
        cleaned = _PUNCT.sub("", token).lower()
        if _YEAR.match(cleaned) or cleaned in _MONTHS or cleaned in _FILLER:
            continue
        kept.append(token)
    result = " ".join(kept).strip()
    return result or name.strip()
