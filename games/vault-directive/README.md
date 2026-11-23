# VAULT DIRECTIVE: BELOW THE SURFACE

A GAMESHUB original, single-player, 2D underground civilization management game.

**Version:** Alpha 0.2 | **Library:** GAMESHUB → Games → **IN DEV**

## New game: begin with almost nothing

All three modes (Standard, Hardcore, Sandbox) now start with **only two rooms**—a Command Center and an automated Power Reactor—and **zero residents**. Standard mode starts with enough resources to construct essential facilities; Sandbox provides extra resources. No residents arrive automatically during training.

The interactive six-step Overseer Tutorial teaches:
1. Select an adjacent empty sector and build **Living Quarters**.
2. Build **Water Works**.
3. Build **Hydroponics**.
4. Use **+ SURVIVOR** to welcome your first settler.
5. Select that person in the roster and assign them to food or water production.
6. Open **SKILLS** and unlock your first permanent upgrade with the starting point.

Each objective has a "show me where" action. The tutorial can be skipped; random threats and scenario controls are held back during training. Completion gives a small scrap/credit bonus. Training progress is saved.

## Skill tree and experience

Automated facilities can work before anyone is recruited, and assigned workers improve production. Players gain experience from construction (+24 XP), recruiting (+15 XP), new job assignments (+10 XP), room upgrades (+18 XP), and each simulated day (+2 XP). Increasing experience thresholds provide one skill point per Overseer level. New runs also start with one point.

Unlockable skills persist for each vault and have prerequisites:

- **Engineering:** Efficient Grid (+25% power); Water Recycling (+30% water, requires Efficient Grid); Nutrient Farming (+30% food); Salvage Teams (+40% scrap).
- **Civilization:** Efficient Construction (20% cheaper new rooms, requires Salvage Teams); Community Outreach (improved loyalty and recruit morale); Modular Quarters (+5 beds per quarters level, requires Community Outreach); Advanced Triage (+30% medical production and healing, requires Community Outreach).
- **Security:** Tactical Training (+15 percentage points to assault chance); Pressure Seals (50% faster siege pressure, requires Tactical Training).

Production, costs, capacity, resident morale, assaults, and sieges are immediately affected by purchased skills.

## Other gameplay

- Connected room excavation, upgrades, repairs, structural damage, staff and daily resource economy.
- Residents have names, traits, personal bonds, health, loyalty and assignments.
- Outbreaks, hostile raids, resident rebellions, occupied sectors and supply-based siege outcomes.
- Standard and Sandbox mode allow counteroffensives, diplomacy or founding a successor vault following overthrow; Hardcore defeat is permanent.
- Developer uprising/raid/outbreak scenario buttons become available **after** training; rebellions require at least four people.
- Browser localStorage saves only, without an account.

## Existing Alpha 0.1 saves

The existing save key, gameshub-vault-directive-v1, is retained. Old alpha saves migrate automatically without deleting rooms or residents. They resume with their tutorial marked complete and a one-point skill tree. To see the new empty start, select **START A NEW VAULT**. Beginning a new run replaces the old save.

## Development

Self-contained HTML/CSS/JavaScript with original procedural Canvas 2D art. One simulated day takes about 2.2 seconds at 1× speed; there is no offline progression.

Run tests with: node --test tests/vault-directive.test.mjs tests/public-library.test.mjs

This is still an early alpha. Further work remains on polish, challenge balance, NPC movement, missions, expeditions, diplomacy and deeper relationships.
