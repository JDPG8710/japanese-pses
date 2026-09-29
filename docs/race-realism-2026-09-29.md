# Piko Circuit: physical contacts and longer distinct courses

Base: latest remote main `6f16999`, on the existing isolated `codex/town-game-polish` worktree. The dirty original checkout is untouched.

Trace: user request → leisure arcade (no grade/subject/question pool) → player-controlled racing → four circuits/four vehicle profiles → town/world arcade race entry → physics, model and real-browser evidence. Learning rewards and stored curriculum paths are unchanged.

## Fixes

- Guardrails previously only rendered; off-road motion was pulled back toward the line. Contacts now constrain the entire oriented vehicle (including mirrors/wings), preserve tangent speed, reflect normal momentum, and carry decaying lateral/yaw impulses. Rival contacts use oriented-box SAT, positional separation and mass-weighted impulses on both vehicles. Contacts are integrated at up to 60 Hz independently of rendering; damage cooldown does not disable collision physics.
- Impacts now produce directional sparks, debris, strength-sensitive impact audio, restrained camera/body motion, visible panel dents and an in-game contact status. Reduced-motion users get no shake/body impact animation. Heavy collisions reduce lives; the existing shield consumes itself to prevent damage. Retry restores panels, lives, particles and input state. Braking leaves bounded pooled tyre marks.
- Selection cards now show the actual route, lap length and distinct translated descriptions; selection rebuilds the preview. A live minimap shows the start, driver and rivals.

## Expansion

Each route is exactly 10 times its own former centreline length, without increasing speed by 10 times. Rounded authored polygons replace compact radial loops:

| Circuit | Lap length | Layout |
| --- | ---: | --- |
| Sunrise | 1461.21 m | long rectangle with broad flowing corners |
| Harbor | 1682.71 m | L-shaped waterfront return |
| Mountain | 1217.55 m | sweeping S-bends and asymmetric mountain loop |
| Neon | 1238.45 m | city blocks and a chicane |

All spawn points have at least 75 m of straight road ahead; roads are 12.5–14 m wide. Three laps now span approximately 3.65–5.05 km. Terrain, water, scenery, shadows, sky and lighting follow the larger playable area.

Vehicles use original procedural geometry at metre scale: lofted body surfaces, wheel openings, glazing, pillars, bucket seats, dashboard/steering wheel, mirrors, door seams, grille, diffuser, exhausts, LED/brake lights, tyres, rims, spokes and calipers. Front wheels steer, wheels roll, body motion responds to braking/contact, and night headlights illuminate the road. Metallic clearcoat uses a generated lighting environment. Stationary detail is batched; each model is below 65 mesh draws.

This is a browser racing implementation, not GTA6 asset reproduction or a soft-body/tyre-temperature simulator. Physical hills are scenery; the driveable road remains level. Real low-end mobile GPU performance is not inferred from headless Chrome.

## Validation

- `npm test`: 212 cases / 44 suites.
- `npm run test:race`: 16 car/track handling pairs; four full three-lap clears through public controls; exact lengths, long starts, no route intersections; barrier containment; OBB momentum; 30/60/120 Hz impact failures and retry; naturally driven rival collision; actual shield pickup/protection; model motion/damage reset/batching/disposal; adjacent arcade smoke tests.
- `npm run test:race:browser`: real WebGL at 1440×900 and 390×844; four routes and all four player models, actual keyboard and multi-touch, pointer capture, blur/pause, finish/retry, collision particles/in-game status and exit cleanup. Screenshots: `.wrangler/race-polish/`.
- Production release gates and live source/health verification are required before marking release complete.
