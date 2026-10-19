# BLACKOUT V4.0 — Tactical Interface Overhaul

**Implementation:** GitHub main branch, October 19, 2026. This is a bespoke competitive tactical-FPS interface, not Ubisoft's game client or licensed audiovisual assets.

## Delivered source integration
- Full-screen home/menu: large operation splash, navigation, bomb training playlist and local-session status.
- Offline-only match preparation overlay: visual queue into operator selection, cancel support, explicitly **1 human + 9 AI**. **Not real network matchmaking.**
- Operator selection: attacker/defender team choice, actual existing five operators per side, selected ability description and statistics, five-slot roster identifying four AI players.
- Loadout: existing real 3D Holo A, Holo B, red-dot and iron optics; actual selectable Carbine 556, Compact-9 SMG, MR-20 marksman rifle, P9 and C12 pistol. Magazine capacities, reserve ammunition, per-shot damage, rate of fire, ADS spread, recoil and first-person silhouettes are updated through the weapon model.
- Settings: mouse sensitivity, controls, audio test, round reset.
- In-game: narrow two-team scoreboard, prep and action status, improved drone scan camera frame, circular live-health readout, right-aligned primary/sidearm ammo, compact contextual gadget UI, bomb compass, defuser status and phase cards.
- Original procedural five-beat phase signal and optional browser text-to-speech phase briefings. This does not use or copy Rainbow Six Siege audio.
- Preserve all gameplay hooks for Smoke, remote C4, frags, flashes, claymores, droning, barricades, cover physics, penetration, objectives, round outcomes and offline AI.

## Source-level QA
- `node --test games/blackout/tests/*.test.mjs` runs game mechanic simulations and V4 UI + loadout regression tests in a local Node environment.
- In-connector static audit: all required `main.js` DOM ID references present, unique HTML ids, modules parse, V4 5-screen menu navigation, local queue cancel/advance and weapon damage/capacity selection simulations.
- **No complete deployed-browser visual smoke test has been run.** Do not label V4 as visually finalized until the following checklist is played through in the deployed build.

## Browser acceptance checklist
1. Hard-reload BLACKOUT; verify HOME renders and no old mechanics-lab landing page remains.
2. PLAY → FIND TRAINING MATCH → see explicitly OFFLINE AI queue → OPERATOR SELECTION; cancel and retry.
3. Switch attacker/defender and verify live operator cards, sigils, stats and a five-slot AI squad roster. Confirm → LOADOUT.
4. Choose SMG and HOLO B; deploy; verify magazine is **32+1**; gun sight changes on the actual 3D model; aim hides hipfire reticle. Switch to pistol with key 2, back with 1, change sight with V.
5. Attacker: drone overlay displays for 45-second prep, X scans, action phase plays original five-beat cue and optional spoken instruction (depending on browser speech support). Check clock, team status and health ring during combat.
6. Defender: pick Smoke, throw G, wait for armed canister, remotely detonate with B; confirm gadget strip updates and audio works.
7. ESC → LOADOUT pause/resume, choose an optic or weapon → resume; confirm health, ammo and objective counters still update correctly. Test round win/loss and next round.
8. Resize window. Inspect F3 errors and browser console. Verify there is no sideways scroll, unreadable selected buttons, or speech audio leak after returning to the menu.

## Honest limits
- Real user-to-user matchmaking, online lobbies, ranked progression, Ubisoft accounts and licensed Siege art/audio are not implemented.
- Some weapon models are procedural variants of the prototype meshes; they are not detailed real-world weapon assets.
- Stage 3B+ gadget expansion and subsequent roadmap milestones should remain paused until V4 usability and browser issues are reviewed.
