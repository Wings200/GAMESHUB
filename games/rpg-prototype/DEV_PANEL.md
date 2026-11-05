# W20.58 Developer Variables — rollout and test notes

The RPG testing field reads a centrally versioned set of balance overrides from
`/api/dev/settings` **before** constructing its weapons and inventory. The
developer UI is mounted only when the backend confirms an authorized GAMESHUB
session. Ordinary players see no developer button.

## Account binding — W20.58.2

Both developers are pinned server-side in `functions/api/dev/settings.js` using
the exact stable GAMESHUB database ID **paired with** its username. No
Cloudflare `DEV_ACCOUNT_IDS` environment variable is required. Display names
alone cannot grant access, and no cookies or session tokens are stored in code.

1. Sign into GAMESHUB as **DynamiteDEV7392** or **DynamiteKid2000**
   (not guest mode).
2. After deployment, open the RPG testing field and use **DEV PANEL** or **F10**.
3. If hidden, check `/api/account/me` to verify both the name and ID match
   the pinned server pair. The IDs were supplied in the names' listed order.
4. Confirm that regular and guest accounts do not see the panel and cannot save.

## Developer interface

Open the RPG testing field and click **DEV PANEL** at the top right or press
**F10**. The structure is:

- Variables → Weapons → individual weapons → damage, magazine, reload,
  recoil, cadence, spread, cap value, and supported special fields.
- Variables → Armor → individual regular armor pieces and power armor tiers →
  armor rating, supported durability and cap value.
- Variables → Scrap → all 31 crafting components and Salvaged Parts → cap value.
- Variables → Healing → Field Medkit → healing and cap value.
- Variables → Miscellaneous → ammunition, clothing, power parts, etc. → cap value.

Edits are a draft until **SAVE & PUBLISH**. **RESTORE ITEM** clears one item's
overrides. The server validates the new numbers and performs a version-checked
atomic D1 update, so stale simultaneous edits receive a conflict instead of
silently overwriting newer settings.

All sessions check the settings version about every 15 seconds and when a
background tab becomes visible. A version change displays **UPDATING GAME**,
requests local-game persistence and refreshes. This refresh is intentional and
may interrupt a current combat test. The server returns no-cache responses.

## Verification

- Run `node --test games/rpg-prototype/balance.test.mjs games/rpg-prototype/dev-settings.test.mjs`.
- Run the existing RPG browser-smoke and inventory UI jobs.
- Sign in with each admin account; verify F10 and the developer button.
- Verify a guest or ordinary account cannot see or write the panel.
- Change the 10mm damage and cap value, then check gameplay and vendor prices.
- Change pump-action reload seconds and check actual animation duration.
- Change steel's value and verify Wren's prices.
- Open the game in another session; save an edit and verify its update overlay
  and refresh. Confirm inventory and local campaign progress survive.

## Boundaries

This first milestone covers the currently implemented RPG weapon/armor/item
catalogs, not every future NPC, AI, quest, world, or multiplayer tuning value.
The D1 configuration is global, but the present client integration is limited
to the RPG testing field; other games still use their own balance systems.
