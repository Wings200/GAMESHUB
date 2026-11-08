"""Vendor authentic Kenney CC0 concrete footstep recordings.

Original CC0 pack: https://kenney.nl/assets/impact-sounds
Mirrored unmodified audio (Kenney Impact Sounds) in the open-source Ropy repo:
https://forge.apps.education.fr/blender-edutech/ropy/ropy/-/tree/v2.6/asset/sounds/kenney_impactsounds
"""
from __future__ import annotations
import pathlib
import urllib.request

ROOT="https://forge.apps.education.fr/blender-edutech/ropy/ropy/-/raw/v2.6/asset/sounds/kenney_impactsounds/"
OUT=pathlib.Path("games/engine-test/assets/audio")

def fetch(filename):
    request=urllib.request.Request(ROOT+filename,headers={"User-Agent":"Mozilla/5.0 (GAMESHUB CC0 sound asset import)"})
    with urllib.request.urlopen(request,timeout=30) as r:
        return r.read(100_000)

def main():
    license_text=fetch("README.txt").decode("utf8","replace")
    cc0=fetch("CC0-1.0.txt").decode("utf8","replace")
    if "CC0" not in license_text and "Creative Commons" not in cc0:
        raise RuntimeError("CC0 provenance unverified")
    files={}
    for i in range(5):
        name=f"footstep_concrete_{i:03d}.ogg"
        data=fetch(name)
        if not(data.startswith(b"OggS") and 2000<=len(data)<=50_000):
            raise RuntimeError(f"Invalid original OGG audio: {name} ({len(data)} bytes)")
        files[name]=data
    OUT.mkdir(parents=True,exist_ok=True)
    for name,data in files.items():
        (OUT/name).write_bytes(data)
        print("Verified recorded CC0 sample:",name,len(data),"bytes")
    (OUT/"KENNEY_LICENSE.txt").write_text(
        "Original Kenney Impact Sounds, CC0 1.0.\n"
        "Source: https://kenney.nl/assets/impact-sounds\n"
        "Mirror: "+ROOT+"\n\n"+license_text+"\n"+cc0,
        encoding="utf8"
    )

if __name__=="__main__":
    main()
