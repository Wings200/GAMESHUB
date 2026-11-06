# W20.63 — Developer Variables + Dedicated Player Tools

## Access
Sign in using one of the **two existing, stable-UUID-bound developer accounts**,
then click DEV PANEL or press F10 in the RPG testing field. The server checks both
the actual authenticated session's account UUID and username. Ordinary/guest
sessions cannot see the editor or publish changes.

## Player Tools → Give Items & Caps (W20.63)

Inside the Developer Panel's left sidebar, beneath the six **VARIABLES**
categories, find the separate **PLAYER TOOLS** heading and click
**GIVE ITEMS & CAPS**. The sidebar remains accessible while the grant page is
open; selecting any Variables category takes you back to the editor.
Search the actual
`ITEM_CATALOG` by name or ID, select a result, enter a quantity from 1 to
999, then click **GIVE ITEM**. The catalog updates automatically when newly
implemented items are added. Archived, unfinished guns are excluded; all ten
rebuilt guns, their ammunition, armor and power-armor pieces, clothing,
supplies and real crafting components are supported.

**GIVE CAPS** adds the requested amount to your campaign wallet, capped at
100,000,000. Each command first goes to `POST /api/dev/grant`, which verifies
the signed-in developer by stable UUID + username and validates the item ID,
quantity or caps amount. The authorized response is applied to **that
browser's existing locally saved backpack/wallet**. Inventory capacity and
stacking remain enforced: the panel reports partial grants or full backpacks.
The granted firearm must be equipped through **I → Weapons → EQUIP**.

The test field no longer spawns a free weapon crate, power-armor starter
cache or crafting-component cache. The one-time +300 vendor credit, the F
ammo restock and the public M infinite-ammo shortcut are disabled. New saves
start without free weapon reserves, a granted gun or starting ammo loaded.
Existing saved loot, vendor trading, enemy drops and quest rewards stay intact.

**Note:** RPG test save data is currently browser-local; this is a validated
admin command, not a server-stored multiplayer inventory transaction. A
production shared inventory would need authoritative account inventory
storage and audit records before letting one admin grant another player items.

## New six-category navigation

**Variables → Weapons**: each actual gun appears *once* in the list. Click it
and select **Base Weapon**, **Receiver**, **Barrel**, **Magazine**, **Stock**,
or **Muzzle**, in that exact order. Pick any implemented part in that slot.
There are NO thousand-entry weapon combination lists. Sights are deliberately
omitted from stat variants. Base guns include the actual ballistics,
magazine, recoil, fire timing, spread, vendor value and all special
laser-crank variables where applicable. Every mod includes every supported
stat bonus / multiplier / added value and an expandable 31-resource cost
editor (0 = component not required). ALL recipe and stat changes update the
**real workbench** after games refresh; you can even add or remove required
ingredient types.

**Variables → Armor / Power Armor**: the **16 implemented regular armor
families** and **six currently implemented powered plate tiers** appear once
each. Choose the actual body slot (head, chest, arms, legs) or base model
for power armor. Damage resistance, real per-slot plate durability where
implemented, and applicable values are editable. Each powered plate can be
tuned independently, while base model values remain available. This is not
an invented armor-mod crafting feature; a dedicated armor workbench remains
a future system.

**Variables → Junk**: empty until actual desk fans, typewriters, etc. have
been implemented. Junk is not confused with crafting Resources.

**Variables → Resources**: 31 real crafting components plus legacy Salvaged
Parts. **Buy Cost** and **Sell Price** only. These are distinct prices used
directly by the merchant system. Existing single-value saved overrides are
migrated to the equivalent old merchant buy/sell prices.

**Variables → Consumables**: implemented aid (Field Medkit, healing amount
and value). Future duration-based SPECIAL/skill effects appear when
actual corresponding consumables exist; no fake skill boosts.

**Variables → Misc**: existing ammunition, field clothing, fusion cores,
etc., with only their implemented variable fields.

## Temporary tests versus approved defaults

Two separate JSON objects are stored in **the same server-side, versioned,
single-row D1 transaction**:
- `changes` = current live published overrides. Friends can test extreme stats.
- `defaults` = intentionally approved baseline overrides, persisted forever
  unless explicitly changed by a developer.

Both start from the factory game values. For any chosen weapon component,
armor piece, or item:
- **SAVE & PUBLISH** only changes what is live, not the baseline.
- **SET AS DEFAULT** (requires confirmation) saves that exact item's current
  draft changes as the new baseline AND publishes the changes together.
- **REVERT TO DEFAULT** places that exact item's saved baseline in the draft,
  leaving other items untouched. SAVE & PUBLISH to make it live.
- **REVERT ALL TO DEFAULTS** (confirmation required) stages *all* item
  baselines in the draft. SAVE & PUBLISH to restore the whole game.

No in-progress draft is applied to players before publish. Optimistic
version checking blocks overwriting another developer's more recent changes.
Players refresh with a brief UPDATING GAME overlay whenever the version
changes; local inventory and current test state persistence is requested
before refresh.

## Persistence/migration and safety
The server automatically adds the `baselines` D1 column on existing
installations while preserving every prior `overrides` JSON. Historical
W20.58 category names (scrap/healing/miscellaneous) are recognized, with
legacy component value converted into equivalent buy/sell prices. Existing
armor tiers, crafted weapon mods, and laser-specific tuning continue to
apply. The server rejects unknown item IDs, fictional parts, invalid
category-specific fields, nonfinite numbers, and edits by unbound accounts.

### Verify
Run `node --test games/rpg-prototype/dev-settings.test.mjs
games/rpg-prototype/dev-grants.test.mjs games/rpg-prototype/balance.test.mjs` and
`node games/rpg-prototype/dev-panel-ui-smoke.mjs` with Chromium and
the workflow's node dependencies installed.

Other game types (REDLINE/BLACKOUT) are not affected.

