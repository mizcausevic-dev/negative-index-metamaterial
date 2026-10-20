# Negative-Index Metamaterial: A 34-Second Anatomy

Interactive Three.js explainer separating the physical wire and split-ring unit cell from the idealized effective-medium model of negative refraction.

**Evidence level: Path A, scientific schematic.** Labeled in the UI as "Schematic electromagnetic response. Not a full-wave simulation." All response curves are qualitative on a normalized frequency axis. No numerical frequency, bandwidth, transmission, reflection, or retrieved material parameter is claimed. Field amplitudes are illustrative.

## What it shows

1. **[0, 5 s)** A circuit-board slab at oblique incidence. E along Z, H in the X-Y incidence plane, propagation in the X-Y plane.
2. **[5, 10 s)** One representative unit cell, enlarged for explanation and labeled as such. Wire along Z. Split ring in the Y-Z plane so the X component of H threads its area.
3. **[10, 17 s)** Wire current in cyan, ring current in violet, gap charge accumulation, and displacement current (dashed) across the capacitive gap. Conduction current never crosses the gap.
4. **[17, 25 s)** Idealized isotropic effective-medium refraction. Gold is time-averaged energy flow `<S>` into the slab. Neutral fronts show `k`, phase progression opposite bulk energy flow.
5. **[25, 34 s)** Parallel-slab exit beam, parallel to the incident beam with lateral offset. The operating marker leaves the schematic double-negative overlap after t = 29 s and the negative-refraction ray fades. The structure is presented as frequency-selective, polarization-dependent, passive, and lossy.

Qualifications kept explicit in the UI: real wire-ring arrays can be anisotropic with magnetoelectric coupling, negative refraction alone does not prove a scalar negative index, and microwave geometry does not scale directly to visible optics. No perfect-lens, invisibility, zero-loss, or broadband claim is made.

## Run

```bash
npm install
npm run dev      # local development
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

## Controls

- Play/pause (Space), replay (R), frame-step (Left/Right arrows, 1/30 s), timeline scrubber, mute, reduced-motion inspection toggle, fullscreen where supported.
- Audio is procedural Web Audio (original score and presentation cues, no samples). It starts only after pressing Play. Pause suspends it. Seek and replay reschedule it from the absolute timeline position.
- Every visual state is a pure function of master-timeline time, so scrubbing to a time reproduces that state. At t = 34 s the final frame holds.

## Validation performed

- `npm run build` (TypeScript + Vite).
- Browser checks in headless Chrome via Playwright against `vite preview`: page loads with no console errors after the favicon fix, scrubbing to t = 13, 21, and 31 s lands on frames 390, 630, and 930 with the correct shot captions, and screenshots of shots 1, 4, and 5 were inspected visually.
- Physics self-checks encoded in the scene geometry: H is constructed perpendicular to the incident propagation in the X-Y plane with a nonzero X component through the ring plane; internal gold energy arrow points into the slab (+X normal component); internal phase fronts move opposite the internal energy direction; exit direction equals incident direction.

## Repository and GitHub Pages

A Pages workflow is included at `.github/workflows/pages.yml` (builds `dist/` and deploys it). Publication requires a GitHub remote with Pages enabled. This workspace was created without a checked-out repository or GitHub credentials, so no push or live URL is claimed here. To publish: create or clone the target repo with these files, push the branch, and enable Pages with the GitHub Actions source.

Suggested GitHub About: "Interactive 34-second 3D explainer of wire and split-ring negative-index metamaterials, with separated phase and energy flow."
Suggested topics: `threejs`, `metamaterials`, `negative-index`, `electromagnetics`, `physics-visualization`, `split-ring-resonator`, `webgl`, `science-communication`.

## Repurposing

The deterministic master-timeline, unit-cell-to-effective-model scale switch, and phase-versus-energy indicator split transfer to other wave topics (acoustic metamaterials, seismic waves, transmission lines) by swapping the unit-cell geometry and the constitutive schematic. The shell (controls, chart, audio engine, camera keys) stays unchanged.
