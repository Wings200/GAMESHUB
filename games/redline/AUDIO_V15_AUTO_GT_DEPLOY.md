# REDLINE GT V15 — Recorded engine (automatic deployment)

The REDLINE GT's recorded engine is accepted after the owner's in-game listening test. Other cars continue using V11.2.

## Production integration
- The main game `index.html` now uses the recorded GT engine **when the integrated audio bank is present**.
- The audio JS requests `./assets/audio/redline-gt-v15-audio.bank` on page load (a REDLINE-specific binary container holding nine compressed Ogg engine recordings), and unpacks eight RPM/load layers and an authentic startup in browser memory.
- The GT fades from V11.2 to V15 after decode; all other vehicles play V11.2. If the asset is absent (HTTP 404), fails to decode, or loads too late, V11.2 remains operational.
- The explicit `?engine=v15` local ZIP test still works; `?engine=v13` and the retired `?engine=v14` behavior are unchanged.
- No game physics, prices, accounts, multiplayer, map content or cash data were modified.

## Upload step required
The GitHub connection accepts text code updates but cannot transmit the binary audio bank from the user's uploaded ZIP. The production asset is prepared **locally**, not yet in the public repository.

Use GitHub's file upload feature to put the generated file exactly at:
`games/redline/assets/audio/redline-gt-v15-audio.bank`

Source for the compressed bundle: the owner's licensed Skril Studio i6 German Free Engine Sound Pack. The file contains only the nine exterior recordings, compressed to Ogg, in a game-specific container; no original standalone WAVs, Unity meta files, or interior samples are shipped. About 215 KB.

**Do not upload the original `i6_german_free.zip`, or expose a separate asset-download UI.** Unity's Standard Asset Store EULA permits licensed non-restricted sounds incorporated in a finished game, not standalone redistribution. The project remains responsible for adhering to its asset-specific terms. See https://unity.com/legal/as-terms .

## QA/limits
- Compressed each of the nine recordings with ffmpeg libvorbis quality 4.8; individually checked Ogg headers and packed-container directory integrity.
- Parsing and fallback code checks passed. Audio output still requires browser playback to validate after the binary is hosted.
- The license and browser limitations mean this audio file must be deployed as an integrated part of the game; if this arrangement proves unsuitable, retain V15 local-only mode or request separate web-distribution permission from Skril Studio.

Credit: Skril Studio — https://skrilstudio.com/portfolios/i6-german-free-engine-sound-pack/
