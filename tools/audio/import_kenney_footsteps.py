"""Fetch the original recorded CC0 Kenney footstep samples for Engine Test.

Source: https://kenney.nl/assets/impact-sounds (Creative Commons Zero 1.0)
Downloads and checks the original archive. This script must run with network.
Never substitute synthesized beeps or unverified random sound URLs.
"""
from __future__ import annotations
import io
import pathlib
import urllib.request
import zipfile

SOURCE = "https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip"
OUTPUT = pathlib.Path("games/engine-test/assets/audio")


def main() -> None:
    request = urllib.request.Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 (GAMESHUB Engine CC0 source import)"})
    with urllib.request.urlopen(request, timeout=40) as response:
        archive_data = response.read(9 * 1024 * 1024)
    if not zipfile.is_zipfile(io.BytesIO(archive_data)):
        raise RuntimeError("Kenney source did not return a valid zip; no substitute")
    with zipfile.ZipFile(io.BytesIO(archive_data)) as archive:
        names = archive.namelist()
        lower = [p.lower() for p in names]
        if not any(p.endswith("license.txt") for p in lower):
            raise RuntimeError("Source archive is missing its license file")
        license_name = names[next(i for i,p in enumerate(lower) if p.endswith("license.txt"))]
        license_text = archive.read(license_name).decode("utf8", "replace")
        if "CC0" not in license_text and "Creative Commons Zero" not in license_text:
            raise RuntimeError("Source license not verified as CC0")
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for index in range(5):
            stem = f"footstep_concrete_{index:03d}.ogg"
            matches = [name for name in names if name.lower().endswith("/audio/" + stem)]
            if len(matches) != 1:
                raise RuntimeError(f"Missing original Kenney sound: {stem}")
            contents = archive.read(matches[0])
            if not (contents.startswith(b"OggS") and 2000 <= len(contents) <= 80_000):
                raise RuntimeError(f"Invalid audio data for {stem}")
            (OUTPUT / stem).write_bytes(contents)
            print(f"Saved verified CC0 recorded footstep: {stem} ({len(contents)} bytes)")
        (OUTPUT / "KENNEY_LICENSE.txt").write_text(license_text, encoding="utf8")
    print("Imported all five authentic source clips.")


if __name__ == "__main__":
    main()
