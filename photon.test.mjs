// photon.test.mjs — the two-surface simulator, falsifiable. The four claims as assertions:
// interference routes (MZI switches ports on internal phase alone), superposition holds until
// the seeded collapse, golden winding never collides while rational winding dies exactly, and
// every mesh conserves energy to the last digit — 200 random meshes say so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KAPPA, GOLDEN_TURN, power, buildMesh, propagate, mzi, goldenPhases, minGap, konomiMesh, measure } from './photon.mjs';

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const powers = (state) => state.map(([re, im]) => re * re + im * im);

test('CLAIM 1 · INTERFERENCE = COMPUTE — the MZI routes by phase alone, in one pass', () => {
  const inp = [[1, 0], [0, 0]];
  const p0 = powers(propagate(mzi(0), inp).state);
  assert.ok(near(p0[0], 0) && near(p0[1], 1), 'θ=0: destructive on port 0, ALL power exits port 1');
  const pPi = powers(propagate(mzi(Math.PI), inp).state);
  assert.ok(near(pPi[0], 1) && near(pPi[1], 0), 'θ=π: the same photon, the other port — interference IS routing');
  const pHalf = powers(propagate(mzi(Math.PI / 2), inp).state);
  assert.ok(near(pHalf[0], 0.5) && near(pHalf[1], 0.5), 'θ=π/2: an honest 50:50');
  // the analytic law, swept: |out0|² = ½(1−cosθ)
  for (const th of [0.3, 1.1, 2.0, 2.9, 4.4, 5.8]) {
    const p = powers(propagate(mzi(th), inp).state);
    assert.ok(near(p[0], 0.5 * (1 - Math.cos(th))), 'the interference law holds at θ=' + th);
  }
});

test('CLAIM 2 · SUPERPOSITION HELD, THEN COLLAPSED — phases are live before measure, gone after', () => {
  // before collapse the state is amplitudes with phase: |a+b|² ≠ |a|²+|b|² — proven by the MZI
  // above (0 ≠ 0.5+0.5). Here: the collapse obeys Born, reproducibly.
  const s = [[Math.SQRT1_2, 0], [0, Math.SQRT1_2]];
  const one = measure(s, 42);
  assert.deepEqual(measure(s, 42), one, 'same state, same seed, same outcome — the record of a run is not random');
  assert.ok(near(one.probability, 0.5), 'a 50:50 amplitude is a 50:50 probability');
  let c0 = 0;
  for (let i = 0; i < 2000; i++) if (measure(s, i).mode === 0) c0++;
  assert.equal(c0, 1001, 'Born statistics over 2000 seeded draws: 1001 — pinned, deterministic, ~half');
  // an uneven state collapses unevenly: |0.9|²=0.81
  const uneven = [[0.9, 0], [0, Math.sqrt(1 - 0.81)]];
  let u0 = 0;
  for (let i = 0; i < 2000; i++) if (measure(uneven, i).mode === 0) u0++;
  assert.ok(u0 > 1540 && u0 < 1700, '≈81% of draws land on the heavy mode (' + u0 + '/2000)');
  assert.match(measure([[0, 0], [0, 0]], 1).why, /nothing to collapse/);
  assert.match(measure(s, -1).why, /must be reproducible/);
  assert.match(measure(s, 1.5).why, /seed must be a non-negative integer/);
  // the generator's exact constant, pinned at a boundary-straddling seed: at seed 128193 the
  // draw lands 3.8e-6 ABOVE the 0.81 threshold — any change to the LCG arithmetic moves it
  // across and flips the mode. Reproducibility means the constants are part of the contract.
  assert.equal(measure(uneven, 128193).mode, 1, 'the draw just clears the heavy mode — the RNG constants are load-bearing');
});

test('CLAIM 3 · φ-WINDING NEVER COLLIDES — rational winding dies exactly, golden holds its floor', () => {
  const quarter = (n) => Array.from({ length: n }, (_, k) => 2 * Math.PI * ((k * 0.25) % 1));
  assert.equal(minGap(quarter(5)).gap, 0, 'winding at 1/4: the 5th channel lands ON the 1st — crosstalk is exact, not gradual');
  assert.equal(minGap(quarter(8)).gap, 0);
  for (const n of [5, 8, 21, 55, 144]) {
    const g = minGap(goldenPhases(n).phases).gap;
    assert.ok(g > 0, 'golden at n=' + n + ' never collides');
    assert.ok((n * g) / (2 * Math.PI) > 0.7, 'the golden floor holds: n·gap/τ > 0.7 at n=' + n + ' (got ' + ((n * g) / (2 * Math.PI)).toFixed(4) + ')');
  }
  // the pinned constant: at n=144 the normalized gap is the golden equidistribution bound
  assert.ok(near((144 * minGap(goldenPhases(144).phases).gap) / (2 * Math.PI), 0.7236, 1e-3), '≈0.7236 — φ arithmetic, not luck');
  assert.ok(near(GOLDEN_TURN, 0.3819660112501051, 1e-12));
  assert.match(goldenPhases(0).why, /positive integer/);
  assert.deepEqual(goldenPhases(1), { ok: true, phases: [0] }, 'one channel is valid — the boundary is at zero');
  assert.match(minGap([1]).why, /at least two/);
  assert.equal(minGap([0, Math.PI]).gap, Math.PI, 'exactly two phases is a valid measurement — the boundary is at one');
  assert.match(minGap([1, NaN]).why, /finite/);
});

test('CLAIM 4 · κ-COUPLING — power splits 0.618:0.382 exactly, and couples without merging', () => {
  const one = buildMesh(2, [{ couplers: [[0, 1, KAPPA]] }]);
  const out = powers(propagate(one, [[1, 0], [0, 0]]).state);
  assert.ok(near(out[0], 0.618, 1e-12) && near(out[1], 0.382, 1e-12), 'the κ split, to the last digit');
  assert.equal(KAPPA, 0.618);
  // couple-don't-merge: both modes still carry power, neither vanished into the other
  assert.ok(out[0] > 0 && out[1] > 0);
});

test('THE MESH REFUSES — a machine that cannot say what it does to every photon never runs', () => {
  assert.match(buildMesh(1, [{ phases: [[0, 1]] }]).why, /at least 2 modes/);
  assert.match(buildMesh(2, []).why, /does nothing — refuse rather than pretend/);
  assert.match(buildMesh(2, ['x']).why, /exactly one of couplers\/phases/);
  assert.match(buildMesh(2, [{ couplers: [[0, 1, 0.5]], phases: [] }]).why, /exactly one/);
  assert.match(buildMesh(4, [{ couplers: [[0, 1, 0.5], [1, 2, 0.5]] }]).why, /mode 1 is in two couplers/);
  assert.match(buildMesh(2, [{ couplers: [[0, 0, 0.5]] }]).why, /two distinct modes/);
  assert.match(buildMesh(2, [{ couplers: [[0, 2, 0.5]] }]).why, /two distinct modes in \[0, 2\)/);
  // each index clause failing ALONE refuses — a guard needing two failures is theatre
  assert.match(buildMesh(2, [{ couplers: [[2, 1, 0.5]] }]).why, /two distinct modes in \[0, 2\)/, 'i at n, alone');
  assert.match(buildMesh(2, [{ couplers: [[-1, 1, 0.5]] }]).why, /two distinct modes/, 'i below zero, alone');
  assert.match(buildMesh(2, [{ couplers: [[0, -1, 0.5]] }]).why, /two distinct modes/, 'j below zero, alone');
  assert.match(buildMesh(2, [{ couplers: [[0.5, 1, 0.5]] }]).why, /two distinct modes/, 'i fractional, alone');
  assert.match(buildMesh(2, [{ couplers: [[0, 1.5, 0.5]] }]).why, /two distinct modes/, 'j fractional, alone');
  assert.match(buildMesh(2, [{ couplers: [[0, 1]] }]).why, /is \[i, j, kappa\]/, 'a well-typed array of the wrong length refuses AS a shape error');
  assert.match(buildMesh(2, [{ phases: [[0]] }]).why, /is \[mode, theta\]/, 'same for a phase');
  assert.match(buildMesh(2, [{ phases: [[-1, 1]] }]).why, /must be in \[0, 2\)/, 'phase mode below zero, alone');
  assert.match(buildMesh(2, [{ phases: [[0.5, 1]] }]).why, /must be in \[0, 2\)/, 'phase mode fractional, alone');
  assert.equal(buildMesh(2, [{ couplers: [[1, 0, 0.5]] }]).ok, true, 'j = 0 is a real mode — order within a coupler is free');
  assert.match(konomiMesh(3.5, 1).why, /at least 2 modes/, 'a fractional n refuses at THIS door, before the phase ladder sees it');
  assert.match(buildMesh(2, [{ couplers: [[0, 1, 0]] }]).why, /not couplers, they are wires/);
  assert.match(buildMesh(2, [{ couplers: [[0, 1, 1]] }]).why, /wires/);
  assert.match(buildMesh(2, [{ phases: [[0, 1], [0, 2]] }]).why, /phase-shifted twice/);
  assert.match(buildMesh(2, [{ phases: [[2, 1]] }]).why, /must be in \[0, 2\)/);
  assert.match(buildMesh(2, [{ phases: [[0, Infinity]] }]).why, /finite/);
  assert.match(propagate(mzi(0), [[1, 0]]).why, /must be 2 amplitudes/);
  assert.match(propagate(mzi(0), [[1, 0], [0, NaN]]).why, /must be 2 amplitudes/);
  assert.match(mzi(NaN).why, /finite/);
  assert.match(mzi(Infinity).why, /^theta must be a finite number$/, 'mzi refuses AT ITS OWN DOOR — no layer prefix, the mesh never saw it');
  assert.match(power([]).why, /non-empty/);
  assert.match(power([[1, 0], 'x']).why, /\[re, im\]/);
  assert.match(konomiMesh(1, 1).why, /at least 2/);
  assert.match(konomiMesh(4, 0).why, /positive integer/);
  // a RAW { n, layers } mesh propagates without the buildMesh wrapper — both handles work
  assert.equal(propagate({ n: 2, layers: [{ phases: [[0, 1]] }] }, [[1, 0], [0, 0]]).ok, true);
  // the smallest konomi mesh, pinned exactly: structure is arithmetic, not vibes
  const km21 = konomiMesh(2, 1);
  assert.deepEqual(km21.mesh.layers, [
    { couplers: [[0, 1, 0.618]] },
    { phases: [[0, 0], [1, 2 * Math.PI * ((1 - 1 / ((1 + Math.sqrt(5)) / 2)) % 1)]] },
  ], 'konomiMesh(2,1): one κ-coupler, then the golden phase ladder at multiplier d+1 = 1');
  assert.equal(konomiMesh(2, 1).ok, true, 'n=2 is a valid mesh — the boundary is below it');
  assert.equal(konomiMesh(4, 1).mesh.layers.length, 2, 'depth 1 = one coupler layer + one phase layer, never more');
});

test('THE INVARIANT FUZZ — 200 random meshes: energy in = energy out, always, exactly', () => {
  let seed = 271828;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 200; t++) {
    const n = 2 + Math.floor(rnd() * 7);
    const layers = [];
    const L = 1 + Math.floor(rnd() * 6);
    for (let l = 0; l < L; l++) {
      if (rnd() > 0.5) {
        const couplers = [];
        const order = Array.from({ length: n }, (_, i) => i);
        for (let i = 0; i + 1 < n; i += 2) if (rnd() > 0.3) couplers.push([order[i], order[i + 1], 0.05 + rnd() * 0.9]);
        if (couplers.length) layers.push({ couplers });
      } else {
        layers.push({ phases: Array.from({ length: n }, (_, i) => [i, rnd() * 7 - 3.5]) });
      }
    }
    if (!layers.length) layers.push({ phases: [[0, 1]] });
    const input = Array.from({ length: n }, () => [rnd() * 2 - 1, rnd() * 2 - 1]);
    const pin = power(input).power;
    const out = propagate(buildMesh(n, layers), input);
    assert.ok(out.ok, 'a valid random mesh propagates');
    assert.ok(near(power(out.state).power, pin, 1e-9), 'the mesh is lossless — unitarity is not a claim, it is a measurement');
    if (pin > 1e-12) {
      const m = measure(out.state, t);
      assert.ok(m.ok && m.mode >= 0 && m.mode < n, 'every collapse lands on a real mode');
    }
  }
  // deep konomi meshes conserve too
  for (const [n, d] of [[4, 3], [8, 6], [6, 10]]) {
    const km = konomiMesh(n, d);
    const inp = Array.from({ length: n }, (_, i) => [i === 0 ? 1 : 0, 0]);
    assert.ok(near(power(propagate(km, inp).state).power, 1, 1e-9), `konomiMesh(${n},${d}) is lossless`);
  }
});
