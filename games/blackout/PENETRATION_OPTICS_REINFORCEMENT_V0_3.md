# BLACKOUT V0.3 — Bullet Holes, Optics, Reinforcement

Build: `0.3.0-bullet-holes-optics-reinforcement` (flat single-player mechanics lab).
Live static file: `/games/blackout/index.html` once Pages deploys.
Redline/Worker unchanged.

## Changes

### Soft-wall bullet perforation

- Two standalone soft-wall test panels are aligned with dummy targets behind them at **x = -12 / +12 meters, z = -29 meters**; rear targets are at z = -36 meters.
- Rifle/pistol fire **does not decrease wall HP or remove the panel**.
- Each valid hit on the 3m x 2.88m soft center makes a persistent visible 0.115m-radius hole with a dark edge, painted as an *actual transparent cutout* in the panel skin's alpha-tested texture.
- World-space bullet-hole coordinates are used by the hit tracing loop. The **first** round through a fresh hole and subsequent rounds through the same hole can hit targets behind the wall, with **68% base damage** after the first soft-material traversal; reinforced steel and exposed metal framing block shots.
- Repeated shots at the same location share one aperture. There is a bounded limit of 160 independent holes per panel to avoid runaway texture redraw cost; beyond that limit, new wall locations block shots. Existing holes remain usable.
- The standing/movement collision remains solid: bullet-size perforations aren't doorways.
- Attacker G standard charges still remove an *unreinforced* entire panel after 1.5 seconds. A reinforced panel denies that standard charge.

### Optics, hipfire and aiming down sights

- Four selectable sights: **Holo A**, **Holo B**, **Red Dot**, **Iron**.
- Change the sight from the main/pause menu selector, or use **V** in the lab to cycle.
- Holo A: circle + center dot; Holo B: small ring, cross markings and dot;
  Red Dot: lone point within rounded housing; Iron: front post.
- The current hipfire crosshair disappears while RMB is held. Instead, the chosen optic's reticle is visible and anchored to the **actual camera shot ray**. Upon releasing RMB, the optic disappears and hipfire crosshair returns.
- The test firearm has a basic physical sight housing following the gun model, alongside the optic reticle. This is prototype geometry, not final rifle/optic assets.
- Hipfire shooting, ADS zoom and gun spread remain; ADS reduces shot spread. Aim sensitivity is reduced while ADS.

### Timed reinforcement

- Defender aim at an intact soft test panel from within **5.3m** and press **F**.
- A **3000ms** action begins, with rising metal plate assembly and visible countdown/progress bar. Movement, mouse aim, and gun use are disabled while installing.
- The wall is only converted to bullet/charge-resistant reinforced material at the **end** of the full 3 seconds, not on F press. One of the 2 reinforcement charges is consumed only on completion.
- Press Esc / exit pointer lock, reset the lab, change roles, or move out of allowed proximity to cancel without spending a charge. An interrupted panel returns to its soft appearance.
- Each wall requires its own full 3-second installation. Already reinforced or removed panels cannot be installed a second time.

## Input delta

| Input | Meaning |
|---|---|
| RMB hold | ADS: hide hipfire crosshair, show selected optic reticle |
| RMB release | Show hipfire crosshair; hide optic reticle |
| V | Cycle Holo A, Holo B, Red Dot and Iron |
| Menu | Choose the optic directly |
| Defender F | Start 3-second reinforcement on aimed panel |
| Esc during reinforcement | Cancel the installation, preserve charge |

Prior V0.2 controls, standalone gadgets, targets, speed sliders and flat world remain.

## Executed automated / mocked checks

- Parsed all five JS modules after stripping module syntax.
- Verified all JS-referenced HTML element IDs exist, all updated assets are
  versioned correctly, and all four sights have selection and styling rules.
- Simulated **100 normal bullet hits** with wall still visible, collidable and intact.
- Tested unique hole creation, repeated shot sharing a hole, frame-edge refusal,
  physical punch-through transparency, reset removing holes, and explicit
  breach charge removal.
- Verified target lane exists behind the panel.
- Simulated defender install start, half-way (1.5s), just before completion
  (2.999s), completion at 3.0s, stock consumption only at completion,
  reinforcement blocking standard ammo and charge, and cancellation preserving
  stock. All mocked checks passed.
- Verified ADS crosshair and optic display rules statically.

## **Not yet proven**

No actual desktop-browser rendering or player-tested screenshot has been reviewed
for this update. The visibility of the tiny holes at distance, sight alignment,
animations and frame-time behavior need a live playthrough. The unit-like tests
are NOT a substitute for real browser input and WebGL validation.

**Manual test recommendation:** approach left panel with rifle while in attacker
role; shoot through it toward the dummy behind it. Confirm wall remains while
holes form and target hit registers. Hold RMB and cycle V through all four
sights: hipfire dot must be invisible during ADS, visible again on release.
Return to menu, select defender, approach panel, press F and time full 3
seconds. Check progressive plates, HUD countdown and steel immunity;
repeat for second wall. Esc mid-install to check cancellation.

V0.3 is a local single-player lab, not real 5v5, destruction replication,
server-verified hit detection or the finished Siege-scale game.
