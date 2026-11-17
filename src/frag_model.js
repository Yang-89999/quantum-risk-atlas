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
/* ---------- QDK resource estimator (open source, microsoft/qdk, MIT) ----------
   vendor/qdk/qcare_qdk_estimator_bg.wasm is the QDK's own estimator crate (source/resource_estimator), unmodified,
   compiled to WebAssembly behind a one-function wrapper (qdk-wasm/). It takes logical counts as 64-bit integers and
   returns the same JSON the QDK Python package returns from LogicalCounts.estimate(). */
const QDK = {state: 'loading', api: null, commit: '', error: '', cache: new Map()};
const QDK_MODELS = {
  qubit_gate_ns_e3: {label: 'ns gates, 10⁻³ · qubit_gate_ns_e3', kind: 'gate', p: 1e-3, tFree: false, note: 'gate-based, 50 ns gates, 100 ns measurement: superconducting or spin-qubit regime'},
  qubit_gate_ns_e4: {label: 'ns gates, 10⁻⁴ · qubit_gate_ns_e4', kind: 'gate', p: 1e-4, tFree: false, note: 'gate-based, 50 ns gates, 100 ns measurement: superconducting or spin-qubit regime, optimistic'},
  qubit_gate_us_e3: {label: 'µs gates, 10⁻³ · qubit_gate_us_e3', kind: 'gate', p: 1e-3, tFree: true, note: 'gate-based, 100 µs operations, T gates at 10⁻⁶: trapped-ion regime'},
  qubit_gate_us_e4: {label: 'µs gates, 10⁻⁴ · qubit_gate_us_e4', kind: 'gate', p: 1e-4, tFree: true, note: 'gate-based, 100 µs operations, T gates at 10⁻⁶: trapped-ion regime, optimistic'},
  qubit_maj_ns_e4: {label: 'Majorana, 10⁻⁴ · qubit_maj_ns_e4', kind: 'maj', p: 1e-4, note: 'Majorana, 100 ns measurements: topological qubits'},
  qubit_maj_ns_e6: {label: 'Majorana, 10⁻⁶ · qubit_maj_ns_e6', kind: 'maj', p: 1e-6, note: 'Majorana, 100 ns measurements: topological qubits, optimistic'},
  custom: {label: 'Custom gate-based qubit', kind: 'gate', custom: true, note: 'your own gate time, measurement time and error rate'},
};
const QDK_QEC = {surface_code: 'Surface code', floquet_code: 'Floquet (Hastings–Haah) code'};
const qdkQecFor = m => (QDK_MODELS[m] || QDK_MODELS.qubit_gate_ns_e3).kind === 'maj' ? ['surface_code', 'floquet_code'] : ['surface_code'];
const qdkNominalP = s => s.qModel === 'custom' ? s.pPhys : (QDK_MODELS[s.qModel] || QDK_MODELS.qubit_gate_ns_e3).p;
/* Which engine prices the physical layer for these settings. Grover counts exceed 64-bit integers, so AES stays on the built-in model. */
const engineFor = s => s.engine === 'qdk' && QDK.state === 'ready' && s.alg !== 'aes' ? 'qdk' : 'builtin';

/* Job parameters in the QDK's own JSON format. o.p overrides every Clifford-level error rate (used by the error-rate sweep). */
function qdkParams(s, o = {}) {
  const m = QDK_MODELS[s.qModel] || QDK_MODELS.qubit_gate_ns_e3;
  let qp;
  if (m.custom) {
    const p = o.p != null ? o.p : s.pPhys, g = Math.max(1, Math.round(s.qGate || 50)) + ' ns', ms = Math.max(1, Math.round(s.qMeas || 100)) + ' ns';
    qp = {instructionSet: 'GateBased', oneQubitMeasurementTime: ms, oneQubitGateTime: g, twoQubitGateTime: g, tGateTime: g,
      oneQubitMeasurementErrorRate: p, oneQubitGateErrorRate: p, twoQubitGateErrorRate: p, tGateErrorRate: p, idleErrorRate: p};
  } else {
    qp = {name: s.qModel in QDK_MODELS ? s.qModel : 'qubit_gate_ns_e3'};
    if (o.p != null) {
      if (m.kind === 'maj') Object.assign(qp, {oneQubitMeasurementErrorRate: o.p, twoQubitJointMeasurementErrorRate: o.p, idleErrorRate: o.p});
      else { Object.assign(qp, {oneQubitMeasurementErrorRate: o.p, oneQubitGateErrorRate: o.p, twoQubitGateErrorRate: o.p, idleErrorRate: o.p}); if (!m.tFree) qp.tGateErrorRate = o.p; }
    }
  }
  const qec = qdkQecFor(s.qModel).includes(s.qec) ? s.qec : 'surface_code';
  const cons = {};
  if (s.maxTF > 0) cons.maxTFactories = Math.round(s.maxTF);
  if (s.depthFactor > 1) cons.logicalDepthFactor = s.depthFactor;
  if (o.maxDurationS) cons.maxDuration = Math.round(o.maxDurationS * 1e9) + ' ns';
  const out = {qubitParams: qp, qecScheme: {name: qec}, errorBudget: s.eps};
  if (Object.keys(cons).length) out.constraints = cons;
  if (o.frontier) out.estimateType = 'frontier';
  return out;
}
/* One Toffoli (or CCZ, or And) of the paper's count is charged as one CCZ magic state. */
const qdkCounts = c => ({numQubits: Math.max(1, Math.round(c.L)), cczCount: Math.max(1, Math.round(c.T))});
function qdkCall(counts, params) {
  if (!(counts.cczCount <= 1e15) || !(counts.numQubits <= 1e8)) return {code: 'Qcare.OutOfRange', message: 'counts are outside the range the QDK engine handles reliably'};
  const key = JSON.stringify(counts) + '|' + JSON.stringify(params);
  if (QDK.cache.has(key)) return QDK.cache.get(key);
  let out;
  try { out = JSON.parse(QDK.api.physical_estimates(JSON.stringify(counts), JSON.stringify([params])))[0]; }
  catch (e) { out = {code: 'Qcare.CallFailed', message: String(e && e.message || e)}; }
  if (QDK.cache.size > 600) QDK.cache.clear();
  QDK.cache.set(key, out);
  return out;
}
/* Normalise one QDK result (or one frontier entry). The engine counts runtime in 64-bit nanoseconds; beyond about 585 years it wraps, which is detected here. */
function qdkPoint(x) {
  const pc = x.physicalCounts, b = pc.breakdown, lq = x.logicalQubit;
  const expectNs = b.logicalDepth * lq.logicalCycleTime;
  return {phys: pc.physicalQubits, runtime: pc.runtime / 1e9, d: lq.codeDistance, factories: b.numTfactories, Llayout: b.algorithmicLogicalQubits,
    depth: b.logicalDepth, tstates: b.numTstates, cycleNs: lq.logicalCycleTime, pLogical: lq.logicalErrorRate,
    physAlg: b.physicalQubitsForAlgorithm, physFac: b.physicalQubitsForTfactories,
    overflow: !(expectNs < 1.8e19) || Math.abs(pc.runtime - expectNs) > 1e-6 * expectNs};
}
/* Same shape as estimate(): the published logical counts of one run, priced by the QDK. */
function estimateQdk(s, o = {}) {
  const c = logicalCost(s);
  const counts = qdkCounts(c), params = qdkParams(s, o);
  const base = {L: c.L, T: c.T, kind: c.kind, runs: c.runs || 1, unit: c.unit, scaled: c.scaled, src: c.src, Lnote: c.Lnote, engine: 'qdk', counts, params, P: 1, windowFeasible: true, windowFactories: null, windowPhys: null};
  const fail = msg => ({...base, d: Infinity, phys: Infinity, perMachine: Infinity, runtime: Infinity, expected: Infinity, fail: 1, pLogical: 1, err: msg});
  if (c.kind !== 'shor') return fail('Grover counts exceed the 64-bit integers the QDK engine takes');
  const x = qdkCall(counts, params);
  if (!x || !x.physicalCounts) return fail(x && (x.message || x.code) || 'the QDK returned no result');
  const q = qdkPoint(x);
  if (q.overflow) return fail('the runtime exceeds the 64-bit nanosecond clock of the QDK engine (about 585 years)');
  return {...base, ...q, perMachine: q.phys, fail: s.eps, expected: q.runtime * base.runs / (1 - s.eps), raw: x};
}
/* The QDK's space–time frontier for the same counts: fewer T factories, longer runtime. */
function qdkFrontier(s) {
  const c = logicalCost(s);
  if (c.kind !== 'shor') return [];
  const x = qdkCall(qdkCounts(c), qdkParams(s, {frontier: true}));
  return (x && x.frontierEntries || []).map(qdkPoint).filter(q => !q.overflow);
}
const estimateAny = (s, o) => engineFor(s) === 'qdk' ? estimateQdk(s, o) : {...estimate(s), engine: 'builtin'};

function qDay(need, q0, year0, doubling) {
  if (!isFinite(need)) return Infinity;
  return need <= q0 ? year0 : year0 + doubling * LOG2(need / q0);
}
const YEAR0 = 2026;

