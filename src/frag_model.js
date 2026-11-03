/* ---------- 0. Shared model (pure) ---------- */
const LOG2 = Math.log2;
const STRENGTH = {1024: 80, 2048: 112, 3072: 128, 4096: 152};
const GRASSL = {128: {L: 2953, tdepth: 1.99e5}, 192: {L: 4449, tdepth: 3.02e5}, 256: {L: 6681, tdepth: 2.35e5}};
/* Gidney 2025, Table 5: expected Toffoli count (shots × per-shot cost) by modulus size. */
const G2025_T = {1024: 1.1e9, 2048: 6.5e9, 3072: 1.9e10, 4096: 4.0e10};

/* Logical-level cost of ONE RUN of the attack, in the unit the source paper uses (never converted).
   `runs`   expected number of runs the source states (1 when it gives none; see the variant note).
   `scaled` true when the chosen key size is not tabulated by the source and the figure is extrapolated
            with the paper's own leading-order formula (a project assumption, flagged in the UI). */
function logicalCost(s) {
  const n = s.keyBits, opt = Math.max(1, s.arithOpt || 1), lg = LOG2(n);
  const shor = (L, T, runs, unit, scaled, src, Lnote) => ({L: Math.round(L), T: T / opt, kind: 'shor', runs, unit, scaled, src, Lnote});
  if (s.alg === 'rsa') {
    if (s.variant === 'g2025') return shor(1399 * n / 2048, (G2025_T[n] || 6.5e9 * Math.pow(n / 2048, 3)) / 9.2, 9.2, 'Toffoli', n !== 2048, 'Gidney 2025, Table 5', n === 2048 ? '1,399 tabulated (Table 5)' : 'scaled n/2048 from 1,399');
    if (s.variant === 'cfs2024') return shor(1730 * n / 2048, Math.pow(2, 36) * Math.pow(n / 2048, 2) * Math.pow(lg / 11, 3), 40, 'Toffoli', n !== 2048, 'Chevignard, Fouque, Schrottenloher 2024/25, abstract', n === 2048 ? '1,730 per abstract (1,633 in Table 4)' : 'scaled n/2 from 1,730');
    return shor(3 * n + 0.002 * n * lg, 0.3 * n ** 3 + 0.0005 * n ** 3 * lg, 1.4, 'Toffoli + T/2', false, 'Gidney and Ekerå 2021, Tables 1 and 3', 'formula 3n + 0.002 n log₂n; not tabulated by the paper');
  }
  if (s.alg === 'ffdlp') {
    const z = 2 * (STRENGTH[n] || Math.round(n / 18));
    const ne = s.variant === 'short' ? 1.5 * z : 2 * n;
    return shor(3 * n + 0.002 * n * lg, 0.2 * n * n * ne + 0.0005 * n ** 3 * lg, 1, 'Toffoli + T/2', true, 'Gidney–Ekerå 2021 arithmetic with the exponent length of the variant (project scaling, no published count)', 'Gidney–Ekerå formula; project scaling');
  }
  if (s.alg === 'ecc') {
    switch (s.variant) {
      case 'luo2026': return shor(3 * n + 6 * Math.floor(lg) + 19, 1056 * n ** 3 / lg, 1, 'Toffoli', false, 'Luo et al. 2026, §6.4, leading-order formula', 'formula 3n + 6⌊log₂n⌋ + 19');
      case 'cfs2026': return shor(1193 * n / 256, Math.pow(2, 38.98) * Math.pow(n / 256, 4), 22, 'Toffoli', n !== 256, 'Chevignard, Fouque, Schrottenloher 2026, abstract', n === 256 ? '1,193 per abstract (3.12n + o(n))' : 'scaled linearly from 1,193');
      case 'schrott2026': return shor(1192 + 16, Math.pow(2, 26.66), 2, 'Toffoli (CCX + CCZ + And)', false, 'Schrottenloher 2026, Tables 1–2, any prime, space-optimised', '1,192 (Table 1) + 16 window qubits');
      case 'babbush2026': return shor(1450, 70e6, 1, 'Toffoli', false, 'Babbush et al. 2026, abstract (stated as upper bounds)', 'upper bound “fewer than 1,450”');
      case 'ionq2026': return shor(1450, 40e6, 2, 'Toffoli', false, 'Häner et al. (IonQ) 2026, Table I', '≈1,450 (Table I: 1,457 / 1,462)');
      default: return shor(9 * n + 2 * Math.ceil(lg) + 10, 448 * n ** 3 * lg + 4090 * n ** 3, 1, 'Toffoli', false, 'Roetteler et al. 2017, Table 2', n === 256 ? '2,330 tabulated (Table 2)' : 'formula 9n + 2⌈log₂n⌉ + 10');
    }
  }
  const g = GRASSL[n] || GRASSL[128], P = Math.max(1, s.machines || 1);
  return {L: g.L, iters: Math.PI / 4 * Math.sqrt(Math.pow(2, n) / P), tdepth: g.tdepth / opt, kind: 'grover', P, runs: 1, unit: 'T-depth', scaled: false, src: 'Grassl et al. 2016'};
}
const pL = (p, d, pth) => 0.1 * Math.pow(p / pth, (d + 1) / 2);

function estimate(s) {
  const c = logicalCost(s);
  const tc = s.cycleUs * 1e-6, tr = s.reactionUs * 1e-6;
  const storage = s.storage === 'yoked' ? 0.3 : 1;
  const foot = s.magic === 'cultivate' ? 30 : 300, period = 10, pth = 0.01;
  const par = Math.max(1, s.parallel || 1);
  const runtimeAt = (d, F) => c.kind === 'grover' ? c.iters * c.tdepth * Math.max(d * tc, tr) : c.T * Math.max(tr / par, period * d * tc / F);
  const failAt = (d, F) => c.L * (runtimeAt(d, F) / tc) * pL(s.pPhys, d, pth);
  let d = s.d;
  if (!s.manualD) { d = 3; while (d < 201 && failAt(d, s.factories) > s.eps) d += 2; }
  if (s.pPhys >= pth) d = Infinity;
  const F = s.factories;
  const perMachine = c.L * 2 * d * d * storage * s.routing + F * foot * d * d;
  const P = c.kind === 'grover' ? c.P : 1;
  const runtime = runtimeAt(d, F);
  const runs = c.runs || 1;
  let windowFactories = null, windowFeasible = true;
  if (s.window && c.kind === 'shor') {
    if (c.T * tr / par > s.window) windowFeasible = false;
    else windowFactories = Math.max(F, Math.ceil(c.T * period * d * tc / s.window));
  } else if (s.window && c.kind === 'grover') windowFeasible = runtime <= s.window;
  const windowPhys = windowFactories ? c.L * 2 * d * d * storage * s.routing + windowFactories * foot * d * d : null;
  const fail = isFinite(d) ? failAt(d, F) : 1;
  return {L: c.L, T: c.kind === 'shor' ? c.T : c.iters * c.tdepth, iters: c.iters, kind: c.kind, d, runtime, runs, unit: c.unit, scaled: c.scaled, src: c.src, Lnote: c.Lnote,
    expected: isFinite(d) && fail < 1 ? runtime * runs / (1 - fail) : Infinity,
    phys: perMachine * P, perMachine, P, pLogical: isFinite(d) ? pL(s.pPhys, d, pth) : 1,
    fail, windowFactories, windowFeasible, windowPhys};
}
function qDay(need, q0, year0, doubling) {
  if (!isFinite(need)) return Infinity;
  return need <= q0 ? year0 : year0 + doubling * LOG2(need / q0);
}
const YEAR0 = 2026;

