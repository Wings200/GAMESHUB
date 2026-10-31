# W09.0 character asset sources

The following high-detail rigged models are loaded through the same-origin Cloudflare Pages function `/api/rpg-models/:model`. They are CC0 1.0 assets from [Grab3D](https://grab3d.com/) and may be used and modified commercially without attribution. Their GLB preview versions are Draco compressed. We cache the upstream response for one day. The site login middleware still protects access.

| Game role | Model | License / source | Animation clips |
| --- | --- | --- | --- |
| Scout | [Soldier](https://grab3d.com/models/characters/soldier/) | CC0 1.0 | walk, run |
| Raider and power-armor pilot | [Cyborg](https://grab3d.com/models/characters/cyborg/) | CC0 1.0 | walk, run |
| Enforcer | [Sci-Fi Soldier](https://grab3d.com/models/characters/sci-fi-soldier/) | CC0 1.0 | walk, run |

These previews are an **intermediate model-quality pass**. The separately equipped armor slots, power-armor chassis, crouch and climb-in animations still need bespoke detailed meshes and more expressive skeletal animation. None of those are claimed finished in W09.0. The hidden original NPC meshes continue to own hit detection and armor values. If a GLB cannot be loaded, the original visible mannequin remains as fallback rather than breaking the game.

Before final launch, pin or self-host the assets and optimize LODs so external availability or license page changes cannot affect production.
