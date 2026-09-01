// photonic-konomi · photon.mjs — THE TWO-SURFACE SIMULATOR (Stage 0, the software twin).
//
// A photonic processor encodes data as amplitude+phase of coherent light, computes by
// INTERFERENCE through a mesh of couplers and phase-shifters, and reads results by
// MEASUREMENT (|amplitude|² — the Born rule). This kernel is that machine as exact complex
// arithmetic, so the four claims stop being prose and become falsifiable:
//
//   1. INTERFERENCE = COMPUTE — a Mach-Zehnder mesh resolves a whole linear operation in ONE
//      propagation. (The layers below are the mesh's spatial structure, not time steps: light
//      crosses all of them in a single pass.)
//   2. SUPERPOSITION HELD, THEN COLLAPSED — the state holds complex amplitudes with live
//      phases until measure() collapses it; before that, phases interfere (|a+b|² ≠ |a|²+|b|²).
//   3. φ-WINDING = ANTI-CROSSTALK — channels at golden-angle-spaced phases never collide;
//      any rational winding does, exactly. Phyllotaxis on the phase circle.
//   4. κ-COUPLING = COUPLE, DON'T MERGE — couplers split power 0.618 : 0.382, energy
//      conserved to the last digit.
//
// Pure and total: bad input → { ok:false, why }, never a throw mid-propagation.
// Amplitudes are pairs [re, im]. No I/O, no clock, no randomness except the SEEDED collapse.

export const KAPPA = 0.618;
export const GOLDEN_TURN = 1 - 1 / ((1 + Math.sqrt(5)) / 2);   // 1 − 1/φ ≈ 0.381966…
const TAU = 2 * Math.PI;

const isAmp = (a) => Array.isArray(a) && a.length === 2 && Number.isFinite(a[0]) && Number.isFinite(a[1]);
const num01open = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1;

/** total optical power of a state — the invariant every mesh must conserve. */
export function power(state) {
  if (!Array.isArray(state) || state.length === 0 || !state.every(isAmp))
    return { ok: false, why: 'a state is a non-empty list of [re, im] amplitudes' };
  let p = 0;
  for (const [re, im] of state) p += re * re + im * im;
  return { ok: true, power: p };
}

/**
 * BUILD MESH — validate the mesh's spatial structure. layers is a list of
 *   { couplers: [[i, j, kappa], …] }  — disjoint mode pairs, each split at its own κ
 *   { phases:   [[i, theta], …] }    — phase shifts on named modes
 * A mesh that cannot say what it does to every photon is refused before any light enters.
 */
export function buildMesh(n, layers) {
  if (!Number.isInteger(n) || n < 2) return { ok: false, why: 'a mesh needs at least 2 modes' };
  if (!Array.isArray(layers) || layers.length === 0) return { ok: false, why: 'a mesh with no layers does nothing — refuse rather than pretend' };
  for (let L = 0; L < layers.length; L++) {
    const layer = layers[L];
    const isC = layer && Array.isArray(layer.couplers), isP = layer && Array.isArray(layer.phases);
    if (isC === isP) return { ok: false, why: `layer ${L}: exactly one of couplers/phases` };
    if (isC) {
      const used = new Set();
      for (const c of layer.couplers) {
        if (!Array.isArray(c) || c.length !== 3) return { ok: false, why: `layer ${L}: a coupler is [i, j, kappa]` };
        const [i, j, k] = c;
        if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= n || j >= n || i === j)
          return { ok: false, why: `layer ${L}: coupler modes must be two distinct modes in [0, ${n})` };
        if (used.has(i) || used.has(j)) return { ok: false, why: `layer ${L}: mode ${used.has(i) ? i : j} is in two couplers — one photon path, one coupler per layer` };
        used.add(i); used.add(j);
        if (!num01open(k)) return { ok: false, why: `layer ${L}: kappa must be in (0,1) — 0 and 1 are not couplers, they are wires` };
      }
    } else {
      const used = new Set();
      for (const p of layer.phases) {
        if (!Array.isArray(p) || p.length !== 2) return { ok: false, why: `layer ${L}: a phase is [mode, theta]` };
        const [i, th] = p;
        if (!Number.isInteger(i) || i < 0 || i >= n) return { ok: false, why: `layer ${L}: phase mode must be in [0, ${n})` };
        if (used.has(i)) return { ok: false, why: `layer ${L}: mode ${i} is phase-shifted twice in one layer` };
        used.add(i);
        if (!(typeof th === 'number' && Number.isFinite(th))) return { ok: false, why: `layer ${L}: theta must be a finite number` };
      }
    }
  }
  return { ok: true, mesh: { n, layers } };
}

/**
 * PROPAGATE — one pass of light through the whole mesh. The state after this call is what
 * exists at the output facet: still amplitudes, still un-collapsed, phases live.
 */
export function propagate(mesh, input) {
  const m = mesh && mesh.mesh ? mesh.mesh : mesh;
  const v = buildMesh(m && m.n, m && m.layers);
  if (!v.ok) return v;
  if (!Array.isArray(input) || input.length !== v.mesh.n || !input.every(isAmp))
    return { ok: false, why: `input must be ${v.mesh.n} amplitudes as [re, im]` };
  let state = input.map(([re, im]) => [re, im]);
  for (const layer of v.mesh.layers) {
    if (layer.couplers) {
      for (const [i, j, k] of layer.couplers) {
        const t = Math.sqrt(k), r = Math.sqrt(1 - k);
        const [ar, ai] = state[i], [br, bi] = state[j];
        // out_i = t·a + i·r·b   ·   out_j = i·r·a + t·b   (the lossless beam-splitter)
        state[i] = [t * ar - r * bi, t * ai + r * br];
        state[j] = [-r * ai + t * br, r * ar + t * bi];
      }
    } else {
      for (const [i, th] of layer.phases) {
        const c = Math.cos(th), s = Math.sin(th);
        const [re, im] = state[i];
        state[i] = [re * c - im * s, re * s + im * c];
      }
    }
  }
  return { ok: true, state };
}

/** the canonical Mach-Zehnder: 50:50 → internal phase θ on the upper arm → 50:50.
 *  θ = 0 sends everything to port 1; θ = π sends everything to port 0. Interference IS routing. */
export function mzi(theta) {
  if (!(typeof theta === 'number' && Number.isFinite(theta))) return { ok: false, why: 'theta must be a finite number' };
  return buildMesh(2, [
    { couplers: [[0, 1, 0.5]] },
    { phases: [[1, theta]] },
    { couplers: [[0, 1, 0.5]] },
  ]);
}

/** φ-WINDING — n channel phases spaced by the golden turn: θ_k = 2π · frac(k·(1−1/φ)). */
export function goldenPhases(n) {
  if (!Number.isInteger(n) || n < 1) return { ok: false, why: 'n must be a positive integer' };
  const out = [];
  for (let k = 0; k < n; k++) out.push(TAU * ((k * GOLDEN_TURN) % 1));
  return { ok: true, phases: out };
}

/** smallest pairwise circular distance between phases — the anti-crosstalk measure. */
export function minGap(phases) {
  if (!Array.isArray(phases) || phases.length < 2 || !phases.every((t) => typeof t === 'number' && Number.isFinite(t)))
    return { ok: false, why: 'minGap needs at least two finite phases' };
  let min = Infinity;
  for (let i = 0; i < phases.length; i++) for (let j = i + 1; j < phases.length; j++) {
    const d = Math.abs(phases[i] - phases[j]) % TAU;
    min = Math.min(min, Math.min(d, TAU - d));
  }
  return { ok: true, gap: min };
}

/** a deterministic Konomi mesh: alternating brick-work κ-couplers and golden phase layers. */
export function konomiMesh(n, depth) {
  if (!Number.isInteger(n) || n < 2) return { ok: false, why: 'a mesh needs at least 2 modes' };
  if (!Number.isInteger(depth) || depth < 1) return { ok: false, why: 'depth must be a positive integer' };
  const g = goldenPhases(n).phases;
  const layers = [];
  for (let d = 0; d < depth; d++) {
    const couplers = [];
    for (let i = d % 2; i + 1 < n; i += 2) couplers.push([i, i + 1, KAPPA]);
    if (couplers.length) layers.push({ couplers });
    layers.push({ phases: g.map((th, i) => [i, ((th * (d + 1)) % TAU)]) });
  }
  return buildMesh(n, layers);
}

/**
 * MEASURE — the collapse. Born rule over |amplitude|², driven by a SEEDED generator so a
 * simulation is reproducible: same state, same seed, same outcome — the physics is random,
 * the record of a run is not. Returns which mode fired and the probability it had.
 */
export function measure(state, seed) {
  const p = power(state);
  if (!p.ok) return p;
  if (p.power < 1e-12) return { ok: false, why: 'nothing to collapse — the state carries no power' };
  if (!Number.isInteger(seed) || seed < 0) return { ok: false, why: 'seed must be a non-negative integer — a run must be reproducible' };
  const r = (((seed * 1103515245 + 12345) % 2147483648) / 2147483648) * p.power;
  let acc = 0;
  for (let k = 0; k < state.length; k++) {
    const [re, im] = state[k];
    acc += re * re + im * im;
    if (r < acc) return { ok: true, mode: k, probability: (re * re + im * im) / p.power };
  }
  const last = state.length - 1;
  const [re, im] = state[last];
  return { ok: true, mode: last, probability: (re * re + im * im) / p.power };
}
