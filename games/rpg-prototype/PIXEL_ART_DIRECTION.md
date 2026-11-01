# RPG Visual Direction — Original 3D Pixel Art (draft)

This is the agreed direction for GAMESHUB's RPG. It is **not** a switch to a 2D game, nor a return to untextured boxes. Keep existing Three.js gameplay, damage hitboxes, inventory, six power-armor slots, and all weapon/optic systems while replacing visual assets independently.

## Visual rules

- Original human-shaped 3D meshes, skinned and animated, with intentionally pixel-art textures; no photorealistic imported soldiers, photo-scanned faces, or generic block mannequins.
- Crisp nearest-neighbor texture sampling. Start with 64–128 px texture sheets per character material and a limited, cohesive color palette; tune by screenshot on the target browser. Avoid noisy textures, blurry upscaling, or over-pixelating the crosshair.
- Defined head, torso, hand, and boot silhouettes. Ground all actors at a consistent human scale (target 1.65–2.05 m for unarmored NPCs), and verify world-space dimensions in idle, walk, run, crouch, and hit animations.
- Three-dimensional shading remains readable, but rough materials and deliberate pixel clusters carry detail. Test at gameplay camera distance and in first/third person.

## Original character briefs

| Role | Silhouette | Original features | Required animation clips |
| --- | --- | --- | --- |
| Scout | Lean and agile | Hooded field jacket, tinted goggles, patchwork trousers, compact kit | Idle, walk, sprint, crouch, aim, fire, hit, death |
| Raider | Uneven scavenger | Asymmetric scrap shoulder guard, layered fabric, salvage belt, exposed forearm wraps | Idle, walk, sprint, crouch, aim, fire, hit, death |
| Enforcer | Heavy human soldier | Angular helmet, broad ballistic vest, reinforced greaves, compact radio pack | Idle, walk, sprint, crouch, aim, fire, hit, death |
| Pilot | Human scale inside suit | Utility jumpsuit, undersuit harness, articulated gloves | Idle, walk, crouch, approach, step in, step out |

Distinct silhouettes must also be recognizable without nameplates and at low texture resolution.

## Power armor

- Design an original mechanical exoskeleton, larger than a human but never skyscraper-sized. The six independently swappable visible plate groups remain head, chest, left/right arm, left/right leg.
- The entry point is at the **back**. Unlock rear torso hinges, spread armor and limb frames, open helmet section, step the pilot in, and close/lock the mechanism in a readable third-person sequence. Reverse for exiting.
- Articulate pistons and guards while walking and crouching, preserve collision dimensions and armor damage reduction, and keep first-person visibility unobstructed.

## UI boundary

The RPG Systems Lab is a development environment, not the final gameplay interface. Keep the everyday HUD focused on HP, stamina, weapon/ammo, interaction prompt, and relevant armor state. Move station telemetry, model diagnostics, and test shortcuts to a deliberately toggled debug panel. The eventual main menu, inventory, and crafting views use the same restrained pixel-art design language.

## Validation gates

1. Approve one original Scout and one power-armor design from in-game screenshots before producing an entire cast.
2. Check idle, movement, crouch, hit reactions, third-person silhouette, world-space height, frame rate, and draw calls in the actual browser; models must never overwrite scale through animations.
3. Preserve and rerun all mechanics, combat, inventory, armor, and browser smoke tests before replacing the existing placeholders.
4. Keep third-party GLBs as removable temporary test assets, not the target look.
