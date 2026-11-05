# W20.59 — Real weapon-modification workbench

## The player loop

Collect the 31 actual crafting components from loot or Wren's salvage vendor.
Open the **physical Station 7 WEAPON WORKBENCH** by pressing E nearby, press U
from the field, or select **CRAFT WEAPON MODS** from the main game menu.

Select any of the ten rebuilt firearms, then one of six weapon-part categories:
**receiver/action, barrel/emitter, magazine/chamber, stock/grip,
muzzle/focuser, or sight/scope**.

Each item shows its gameplay effect, exact resource requirements, and how many
of those components the player owns. Crafting is atomic: if *any* ingredient
is missing, no resource is removed. A crafted part becomes unlocked for that
weapon and can be reinstalled at no cost; other weapons must craft their own
compatible variant. Factory components can always be restored for free,
without producing refundable materials.

## Mechanically appropriate materials

- Mechanical receivers require **steel, screws, springs, oil**, with
  additional **gears, aluminum or adhesive** for calibrated machinery.
- Long or vented barrels consume **steel, screws and adhesive** or
  **aluminum, steel and oil**.
- Magazines require **springs, steel, screws**; drum magazines additionally
  use **aluminum, gears, and multiple springs**.
- Stocks and grips require **wood, rubber, leather, screws and adhesive**.
- Gas brakes need **steel and oil**. Suppressors need **steel, fiberglass,
  rubber and adhesive**.
- The Laser Musket uses **circuitry, copper, crystal, glass, fiber optics
  and nuclear material** for its emitter and capacitor. It never pretends
  a fusion-cell circuit can be built only from wood.
- Sights and scopes need **real glass, crystal, screws, fiber optics,
  circuitry** where appropriate.

The double-barrel shotgun keeps exactly two chambers; an enhanced extraction
assembly improves reload speed rather than inventing extra barrels.

## Real stats and 3D models

Installed modifications alter the same effective weapon spec consumed by
firing, reload and recoil systems. They also mount physical receiver plates,
barrel shrouds/extensions, magazine assemblies, grips, muzzle fittings and
sights on the *original* first-person and third-person weapon models.
Animations and handholds are preserved. If a shorter magazine is fitted,
excess loaded rounds are safely returned to ammunition reserves.

Mods, compatible sights, unlocked blueprints and available materials are all
saved in the **existing player inventory save** and sanitized when loaded.

## Developer editing

Inside **Developer Panel > Variables > Weapons**, modification blueprints
appear under **Weapon Mods / [part category]**. Authorized developers can
edit bonus damage, capacity, recoil, spread, reload speed, fire interval,
value, and the per-component crafting costs. Saving publishes the settings
to the existing versioned endpoint and triggers the normal updating-game
notification to connected players.

## Quality checks

The CI checks weapon recipes, atomic ingredient deductions, compatibility,
save migration, live ammo/reload/recoil changes, developer-editable blueprints,
and headless browser interactions including 3D first/third-person model changes
and reload persistence.

Legacy unrelated gameplay/animation tests still have known failures. The new
crafting tests are tested independently in the dedicated workflow job.
