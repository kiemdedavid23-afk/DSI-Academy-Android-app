#!/usr/bin/env python3
"""
Télécharge les polices (licence SIL OFL) depuis le dépôt officiel google/fonts et
génère les coupes statiques attendues par l'app (src/assets/fonts).

Utilisé par le workflow .github/workflows/fetch-fonts.yml (le runner a accès à internet).
Les noms de fichiers de sortie sont le nom de famille Android (fontFamily) :
ils doivent correspondre à src/shared/designsystem/theme/fonts.ts (EXPECTED_FONT_FILES,
vérifié par le test designsystem.fonts.tests.ts).

Fraunces : axes opsz = 36, SOFT = 0, WONK = 0 (titres) [À CONFIRMER sur APK].
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"
API = "https://api.github.com/repos/google/fonts/contents/ofl/{folder}"

# (dossier google/fonts, préfixe du fichier source) -> coupes à produire
# nom de sortie -> axes fixés (None = police statique copiée telle quelle)
FRAUNCES_AXES = {"opsz": 36, "SOFT": 0, "WONK": 0}

SOURCES = {
    "fraunces-roman": ("fraunces", "Fraunces[", {
        "Fraunces-Regular": {**FRAUNCES_AXES, "wght": 400},
        "Fraunces-Medium": {**FRAUNCES_AXES, "wght": 500},
        "Fraunces-SemiBold": {**FRAUNCES_AXES, "wght": 600},
        "Fraunces-Bold": {**FRAUNCES_AXES, "wght": 700},
    }),
    "fraunces-italic": ("fraunces", "Fraunces-Italic[", {
        "Fraunces-Italic": {**FRAUNCES_AXES, "wght": 400},
        "Fraunces-MediumItalic": {**FRAUNCES_AXES, "wght": 500},
        "Fraunces-SemiBoldItalic": {**FRAUNCES_AXES, "wght": 600},
    }),
    "manrope": ("manrope", "Manrope[", {
        "Manrope-Regular": {"wght": 400},
        "Manrope-Medium": {"wght": 500},
        "Manrope-SemiBold": {"wght": 600},
        "Manrope-Bold": {"wght": 700},
        "Manrope-ExtraBold": {"wght": 800},
    }),
    "plexmono": ("ibmplexmono", "IBMPlexMono-Medium.ttf", {
        "IBMPlexMono-Medium": None,
    }),
}

LICENSES = {
    "fraunces": "OFL-Fraunces.txt",
    "manrope": "OFL-Manrope.txt",
    "ibmplexmono": "OFL-IBMPlexMono.txt",
}


def http_get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "dsi-fetch-fonts"})
    token = os.environ.get("GITHUB_TOKEN")
    if token and url.startswith("https://api.github.com/"):
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def list_folder(folder: str) -> list:
    return json.loads(http_get(API.format(folder=folder)))


def find_file(listing: list, folder: str, prefix: str) -> dict:
    for entry in listing:
        if entry.get("type") == "file" and entry["name"].startswith(prefix):
            return entry
    names = ", ".join(e["name"] for e in listing)
    sys.exit(f"ERREUR : aucun fichier '{prefix}...' dans google/fonts/ofl/{folder}. Fichiers vus : {names}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    listings = {}
    work = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "dsi-fonts-src"
    work.mkdir(parents=True, exist_ok=True)

    for key, (folder, prefix, outputs) in SOURCES.items():
        if folder not in listings:
            listings[folder] = list_folder(folder)
        entry = find_file(listings[folder], folder, prefix)
        source_path = work / f"{key}.ttf"
        source_path.write_bytes(http_get(entry["download_url"]))
        print(f"[{key}] source : {entry['name']} ({source_path.stat().st_size} octets)")

        for out_name, axes in outputs.items():
            target = OUT_DIR / f"{out_name}.ttf"
            if axes is None:
                target.write_bytes(source_path.read_bytes())
            else:
                font = TTFont(source_path)
                available = {axis.axisTag for axis in font["fvar"].axes}
                limits = {tag: value for tag, value in axes.items() if tag in available}
                missing = sorted(set(axes) - available)
                if "wght" in missing:
                    sys.exit(f"ERREUR : l'axe wght est absent de {entry['name']}")
                if missing:
                    print(f"  axes absents ignorés pour {out_name} : {missing}")
                static = instancer.instantiateVariableFont(font, limits, inplace=False)
                static.save(target)
            print(f"  -> {target.name} ({target.stat().st_size} octets)")

    for folder, file_name in LICENSES.items():
        if folder not in listings:
            listings[folder] = list_folder(folder)
        entry = find_file(listings[folder], folder, "OFL.txt")
        (OUT_DIR / file_name).write_bytes(http_get(entry["download_url"]))
        print(f"licence : {file_name}")

    expected = [f"{name}.ttf" for *_, outputs in SOURCES.values() for name in outputs]
    problems = [
        name for name in expected
        if not (OUT_DIR / name).exists() or (OUT_DIR / name).stat().st_size < 1000
    ]
    if problems:
        sys.exit(f"ERREUR : fichiers absents ou vides : {problems}")
    print(f"OK : {len(expected)} polices et {len(LICENSES)} licences dans {OUT_DIR}")


if __name__ == "__main__":
    main()
