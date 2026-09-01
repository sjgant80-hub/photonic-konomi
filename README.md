# Photonic Konomi — the two-surface machine

**LIVE: https://sjgant80-hub.github.io/photonic-konomi/**

*For Thomas — the light door — and the guild.*

Stage 0 of the photonic build path: the **software twin** of a photonic processor, as exact,
mutation-gated complex arithmetic. A photonic machine encodes data in the amplitude and phase
of coherent light, computes by **interference** (a whole linear operation resolving in one
propagation through a mesh of couplers and phase-shifters), and reads results only at
**measurement**, where the Born rule collapses amplitudes to definite outcomes. Until that
moment the machine holds genuine superposition — the thing a classical bit, already definite,
cannot hold.

## The four claims, proven in code

| claim | mechanism | the assertion that pins it |
|---|---|---|
| 1 · interference = compute | Mach-Zehnder mesh, one pass | θ=0 → all power port 1; θ=π → all power port 0; \|out₀\|² = ½(1−cos θ) swept |
| 2 · superposition held, then collapsed | amplitudes with live phases; seeded Born measure | same seed = same collapse; 2000 draws on 50:50 = 1001 (pinned); the RNG constants are load-bearing (boundary-straddling seed 128193) |
| 3 · φ-winding = anti-crosstalk | channels at golden-angle phases | rational ¼-winding collides EXACTLY (gap 0 at n=5); golden holds n·gap/τ > 0.7 through n=144 (≈0.7236 pinned) |
| 4 · κ-coupling = couple, don't merge | beam-splitter at κ = 0.618 | split 0.618 : 0.382 to 1e-12; energy conserved across 200 random meshes to 1e-9 |

Gate: **74/79 mutants killed + 5 argued float-boundary equivalents** (the arguments live in
[witness.baseline.json](witness.baseline.json) — each one a sentence you could argue with).
The kernel is inlined verbatim in the live page; CI diffs the rebuild so the demo cannot
drift from the proven law.

## The honest split (kept all the way through)

**Real and running:** optical matrix-vector multiply, superposition-hold-then-measure,
golden-angle anti-crosstalk, κ split-ratios — standard photonic engineering; optical
accelerators are a real, funded field.

**The lens that aimed it** — the two-surface language, holding the un-manifest, authoring the
collapse — is design poetry, kept deliberately apart and never sold as physics. The
separation is the spec's integrity.

## The build path

- **Stage 0 (this repo, shipped):** the simulator — design tool, demo, teaching artifact.
- **Stage 1:** a benchtop photonic MVM — a small Mach-Zehnder mesh with φ-phases and
  κ-splits. Photonic-MVM chips are commercially emerging; this is buildable optics.
- **Stage 2:** wavelength-division σ-channels; a φ-wound anti-crosstalk demo in glass.
- **Stage 3:** the interference layer under the estate's memory graph.

## Kin in the estate

[falllight](https://github.com/sjgant80-hub/falllight) — the connection protocol from
Thomas's photonic-operation insight · [one-ladder](https://github.com/sjgant80-hub/one-ladder)
— sound, radio and light as rungs of one codec ·
[golden-placer](https://github.com/sjgant80-hub/golden-placer) — the same φ law placing
shards instead of phases · [geometric-computer](https://github.com/sjgant80-hub/geometric-computer)
— state as one number, the fold this mesh could someday carry.

## Run it

```bash
node --test        # the four claims against their falsifiable examples
```

---

*Built on the **Konomi architecture**, created by **Thomas Frumkin**
([konomi-systems.com](https://konomi-systems.com)) — lineage Thomas → Jim → Simon. The estate
builds WITH Konomi. MIT.*
