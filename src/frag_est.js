/* ---------- 1. Estimator module ---------- */
/* Variants are published circuits. `keys` restricts the sizes a variant is published for; `note` is shown under the control. */
const ALGS = {
  rsa: {name: 'RSA (integer factoring)', keys: [1024, 2048, 3072, 4096], hint: 'modulus bits', vhint: 'Shor-type period finding; cost per run in the paper’s unit',
    variants: [
      {id: 'ge2021', label: 'Gidney–Ekerå 2021: windowed arithmetic [1]', note: '3n + 0.002 n log₂n logical qubits (formula; the paper tabulates no number) and 0.3n³ + 0.0005 n³ log₂n “Toffoli + T/2” per run: 2.7·10⁹ at n = 2048. Table 3 gives a 31 % retry risk per run, ≈1.4 expected runs, charged here for every size.'},
      {id: 'cfs2024', label: 'Chevignard–Fouque–Schrottenloher 2024: residue arithmetic, qubit-minimal [18]', note: '1,730 logical qubits and 2³⁶ Toffoli per run at n = 2048 with 40 runs on average (abstract; Table 4 as read gives 1,633 qubits and 60 runs, unresolved). Other sizes are scaled with the paper’s n/2 + o(n) qubits and O(n² log³n) gates.'},
      {id: 'g2025', label: 'Gidney 2025: approximate residue arithmetic [2]', note: '1,399 logical qubits (1,409 peak active; 1,537 incl. idle hot patches) and expected Toffoli totals 1.1·10⁹ / 6.5·10⁹ / 1.9·10¹⁰ / 4.0·10¹⁰ for 1024 / 2048 / 3072 / 4096 bits (Table 5), spread here over the 9.2 expected shots stated for n = 2048.'},
    ]},
  ecc: {name: 'ECC (elliptic-curve DLP)', keys: [256, 384, 521], hint: 'curve field bits (P-256 / P-384 / P-521)', vhint: 'Also covers ECDH, ECDSA, Ed25519-class',
    variants: [
      {id: 'roetteler', label: 'Roetteler et al. 2017: Shor, affine Montgomery arithmetic [3]', note: '9n + 2⌈log₂n⌉ + 10 qubits and 448n³log₂n + 4090n³ Toffoli: 2,330 qubits, 1.26·10¹¹ Toffoli at P-256 (Table 2). Exceptional cases ignored; the controlled point addition was compiled and classically simulated.'},
      {id: 'luo2026', label: 'Luo et al. 2026: mid-circuit measurement, signed windows [30]', note: '3n + 6⌊log₂n⌋ + 19 qubits and 1056 n³/log₂n Toffoli (leading order, §6.4): 835 qubits and 2^30.88 Toffoli at 256 bits. Repetitions not reported, so one run is charged. Qiskit implementation for 64–512 bits; no repository found.'},
      {id: 'cfs2026', label: 'Chevignard–Fouque–Schrottenloher 2026: RNS, projective, no inversion [28]', note: '1,193 qubits (3.12n + o(n)) and 2^38.98 Toffoli per run at P-256, 22 independent runs (abstract). Other sizes are scaled as n⁴ (the paper’s Õ(n⁴)); the qubit count relies on heuristic assumptions.'},
      {id: 'schrott2026', label: 'Schrottenloher 2026: 28 windowed additions, open reconstruction [31]', keys: [256], note: '1,192 + 16 qubits (space-optimised) and 2^26.66 Toffoli (CCX + CCZ + And) for any 256-bit prime, as 28 × (3·2¹⁶ + Q_A) with Q_A = 2^21.78 per windowed addition (Tables 1–2). One run succeeds with probability > 1/2, so 2 expected runs are charged as an upper bound. Published for 256-bit curves only.'},
      {id: 'babbush2026', label: 'Babbush et al. 2026 (Google): secp256k1, circuits withheld [29]', keys: [256], note: 'Fewer than 1,450 logical qubits and 70 M Toffoli, or fewer than 1,200 and 90 M (abstract; upper bounds). Algorithmic success probability not given, so one run is charged. Correctness attested by a zero-knowledge proof over 9,000 random inputs; the v1 verifier was bypassed by Trail of Bits and patched. 256-bit only.'},
      {id: 'ionq2026', label: 'Häner et al. 2026 (IonQ): secp256k1, fully compiled [32]', keys: [256], note: '≈1,450 logical qubits (1,457 / 1,462 incl. window qubits), ≈40·10⁶ Toffoli and 75,251,329 measurement layers (Table I). Single-run success 40.7–63.3 %, charged here as 2 expected runs. Circuits withheld. 256-bit only.'},
    ]},
  ffdlp: {name: 'Finite-field DLP (DH, DSA)', keys: [1024, 2048, 3072, 4096], hint: 'prime modulus bits', vhint: 'Shor-type; cost scales with exponent length',
    variants: [
      {id: 'safe', label: 'Full-length exponent (safe-prime group)', note: 'Project scaling: Gidney–Ekerå 2021 modular arithmetic [1] with a 2n-bit exponent. The review records no published finite-field DLP count; Pappalardo et al. 2026 [25] compile one but only the abstract was readable.'},
      {id: 'short', label: 'Ekerå–Håstad: short exponent (≈ 3× security level)', note: 'Project scaling: the same arithmetic with the exponent shortened to ≈3× the security level [4]. No published count for this size in the review.'},
    ]},
  aes: {name: 'AES (symmetric, Grover)', keys: [128, 192, 256], hint: 'key bits', vhint: 'Quadratic speed-up only',
    variants: [
      {id: 'grassl', label: 'Grassl et al. 2016 oracle [5]', note: 'Grassl et al. logical qubits and per-iteration T-depth. Symmetric key search was outside the scope of the literature review; see Jaques et al. 2020 [6] for the later oracle costs.'},
    ]},
};
const variantOf = (alg, id) => ALGS[alg].variants.find(v => v.id === id) || ALGS[alg].variants[0];
const keysFor = (alg, id) => variantOf(alg, id).keys || ALGS[alg].keys;
const HW = {pPhys: 1e-3, cycleUs: 1, reactionUs: 10, factories: 28, magic: 'distill', storage: 'surface', routing: 1.4, eps: 0.1, parallel: 1, arithOpt: 1, window: 0, machines: 1,
  qModel: 'qubit_gate_ns_e3', qec: 'surface_code', qGate: 50, qMeas: 100, maxTF: 0, depthFactor: 1};
const PRESETS = [
  {label: 'Gidney–Ekerå 2021 · RSA-2048', s: {...HW, alg: 'rsa', keyBits: 2048, variant: 'ge2021'}},
  {label: 'Gidney 2025 · RSA-2048', s: {...HW, alg: 'rsa', keyBits: 2048, variant: 'g2025', factories: 6, magic: 'cultivate', storage: 'yoked', routing: 1.2}},
  {label: 'Chevignard et al. 2024 · RSA-2048', s: {...HW, alg: 'rsa', keyBits: 2048, variant: 'cfs2024', factories: 4, magic: 'cultivate', storage: 'yoked', routing: 1.2}},
  {label: 'Babbush et al. 2026 · secp256k1', s: {...HW, alg: 'ecc', keyBits: 256, variant: 'babbush2026', magic: 'cultivate', routing: 1.2}},
  {label: 'IonQ 2026 · secp256k1 · ions', s: {...HW, alg: 'ecc', keyBits: 256, variant: 'ionq2026', pPhys: 1e-4, cycleUs: 1000, reactionUs: 1000, factories: 4, qModel: 'qubit_gate_us_e4'}},
  {label: 'Luo et al. 2026 · P-256', s: {...HW, alg: 'ecc', keyBits: 256, variant: 'luo2026'}},
  {label: 'DH-2048 short exponent', s: {...HW, alg: 'ffdlp', keyBits: 2048, variant: 'short'}},
  {label: 'AES-128 · Grover', s: {...HW, alg: 'aes', keyBits: 128, variant: 'grassl'}},
];
/* Deployed algorithms, each mapped to the hard problem behind it and the published circuit used to cost it.
   `note` flags a mapping that is the project's own and not a published count for that exact algorithm. */
const DEPLOYED = [
  {grp: 'Public-key · broken by Shor’s algorithm', items: [
    {id: 'rsa1024', label: 'RSA-1024', alg: 'rsa', variant: 'g2025', keyBits: 1024, attack: 'Shor, factoring'},
    {id: 'rsa2048', label: 'RSA-2048', alg: 'rsa', variant: 'g2025', keyBits: 2048, attack: 'Shor, factoring'},
    {id: 'rsa3072', label: 'RSA-3072', alg: 'rsa', variant: 'g2025', keyBits: 3072, attack: 'Shor, factoring'},
    {id: 'rsa4096', label: 'RSA-4096', alg: 'rsa', variant: 'g2025', keyBits: 4096, attack: 'Shor, factoring'},
    {id: 'p256', label: 'ECDSA / ECDH P-256', alg: 'ecc', variant: 'schrott2026', keyBits: 256, attack: 'Shor, elliptic-curve discrete log'},
    {id: 'k256', label: 'ECDSA secp256k1', alg: 'ecc', variant: 'babbush2026', keyBits: 256, attack: 'Shor, elliptic-curve discrete log'},
    {id: 'c25519', label: 'Ed25519 / X25519', alg: 'ecc', variant: 'schrott2026', keyBits: 256, attack: 'Shor, elliptic-curve discrete log', note: 'project mapping: the 255-bit curve is costed with the circuit for any 256-bit prime; the review records no Curve25519-specific circuit'},
    {id: 'p384', label: 'ECDSA / ECDH P-384', alg: 'ecc', variant: 'luo2026', keyBits: 384, attack: 'Shor, elliptic-curve discrete log'},
    {id: 'p521', label: 'ECDSA / ECDH P-521', alg: 'ecc', variant: 'luo2026', keyBits: 521, attack: 'Shor, elliptic-curve discrete log'},
    {id: 'dh2048s', label: 'DH-2048 / DSA-2048', alg: 'ffdlp', variant: 'short', keyBits: 2048, attack: 'Shor, discrete log with a short exponent or small subgroup'},
    {id: 'dh3072s', label: 'DH-3072', alg: 'ffdlp', variant: 'short', keyBits: 3072, attack: 'Shor, discrete log with a short exponent'},
    {id: 'elg2048', label: 'ElGamal-2048 / DH-2048, full exponent', alg: 'ffdlp', variant: 'safe', keyBits: 2048, attack: 'Shor, discrete log in a safe-prime group'},
  ]},
  {grp: 'Symmetric · weakened by Grover’s algorithm', items: [
    {id: 'aes128', label: 'AES-128', alg: 'aes', variant: 'grassl', keyBits: 128, attack: 'Grover key search'},
    {id: 'aes192', label: 'AES-192', alg: 'aes', variant: 'grassl', keyBits: 192, attack: 'Grover key search'},
    {id: 'aes256', label: 'AES-256', alg: 'aes', variant: 'grassl', keyBits: 256, attack: 'Grover key search'},
  ]},
];
const DEPLOYED_FLAT = DEPLOYED.flatMap(g => g.items);
let DEPLOY_ID = '';
let ENGINE_WANT = 'qdk';
/* Reference runs of the newer QDK estimator (qdk.qre), computed offline by tools/qre_reference_runs.py and embedded as JSON. */
const QRE = (() => { try { return JSON.parse(document.getElementById('qre-data').textContent); } catch (e) { return {runs: []}; } })();
const QRE_ARCH = {qubit_gate_ns_e3: 'ns_e3', qubit_gate_ns_e4: 'ns_e4'};
const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const plural = (n, one, many) => n === 1 ? one : many;
const fmtCycle = ns => ns >= 1e6 ? (ns / 1e6).toPrecision(3) + ' ms' : ns >= 1e3 ? (ns / 1e3).toPrecision(3) + ' µs' : ns + ' ns';
const fmtDur = sec => { const t = fmtT(sec); return (t.v + ' ' + t.u).trim(); };
/* Published anchors, quoted in each paper's units. Chart fields: p (gate error rate), q (physical qubits), t (runtime in seconds, as published). */
const ANCHORS = [
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Häner 17', src: 'Häner, Roetteler, Svore 2017 [17]', target: 'RSA-n', cov: 'Complete, one run (formula)', L: '2n + 2', T: '64 n³ log₂n + O(n³) Toffoli (formula; GE21 cites 5.2·10¹² for n = 2048)', phys: '—', time: '—', hw: 'logical level', ev: 'Implemented and simulated in LIQUi|⟩ up to 8,192-bit inputs; no n = 2048 table in the paper'},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'GE21', src: 'Gidney & Ekerå 2021 [1]', target: 'RSA-2048', cov: 'Complete; per run (≈1.4 expected runs, 31 % retry risk)', L: '3n + 0.002 n log₂n (formula; no number tabulated)', T: '2.7·10⁹ Toffoli + T/2', phys: '20 M (script); ≈23 M hand estimate', time: '5.1 h per run (Table 3); 8 h in the title', hw: 'surface code d = 27, p = 10⁻³, 1 µs cycle, 10 µs reaction, 28 CCZ factories, planar superconducting', ev: 'Analytical estimate with released cost script; verified in primary source', p: 1e-3, q: 20e6, t: 5.1 * 3600},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'CFS 24', src: 'Chevignard, Fouque, Schrottenloher 2024/25 [18]', target: 'RSA-2048', cov: 'One run; 40 runs on average (abstract) or 60 (Table 4 as read)', L: '1,730 (abstract); 1,633 incl. 487 ancillae (Table 4 as read)', T: '2³⁶ Toffoli per run (Table 4: 2^35.61 Toffoli, 2^35.13 CNOT)', phys: '—', time: 'depth 2^33.42 per run', hw: 'logical level; relies on Heuristics 1–2', ev: 'Analytical; Qiskit estimates of building blocks; classical post-processing implemented; abstract/body discrepancy unresolved'},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Gidney 25', src: 'Gidney 2025 [2]', target: 'RSA-2048', cov: 'Complete; expected cost = 9.2 shots × per-shot', L: '1,399 (Table 5); 1,409 peak active; 1,537 incl. idle hot patches', T: '6.5·10⁹ Toffoli expected', phys: '897,864 (“< 1 million”)', time: '12.07 h per shot; 4.96 days expected', hw: 'hot storage d = 25 surface code, yoked cold storage, magic-state cultivation + 8T→CCZ, 6 factories, p = 10⁻³, 1 µs / 10 µs, square grid', ev: 'Analytical + released code; masking simulated; cold storage not simulated under realistic workloads (stated); Assumptions 1–2 conjectural', p: 1e-3, q: 897864, t: 12.07 * 3600},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Gouzien 21', src: 'Gouzien & Sangouard 2021 [19]', target: 'RSA-2048', cov: 'Complete', L: '8,284', T: 'not reported in the review', phys: '13,436 processor qubits + multimode memory of ≈28 M spatial modes', time: '177 days', hw: '3D gauge colour codes d = 47, rare-earth-ion photon-echo memory, p = 10⁻³, 1 µs', ev: 'Analytical with released code; memory modes are not counted as qubits, so no chart point'},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Gouzien 23 (cat)', src: 'Gouzien et al. 2023 [20]', target: 'RSA-2048', cov: 'Complete', L: 'not reported in the review', T: 'windowed Shor', phys: '349,133 cat qubits (often quoted as 350,000)', time: '4 days', hw: 'repetition cat code, lattice surgery, κ₁/κ₂ = 10⁻⁵, ≈19 photons, 500 ns, 2D grid', ev: 'Analytical; no gate error rate comparable to the surface-code axis', q: 349133, t: 4 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Zhou 25', src: 'Zhou et al. 2025 [21]', target: 'RSA-2048', cov: 'Complete', L: 'not reported in the review', T: 'transversal-gate architecture', phys: '19 M', time: '5.6 days', hw: 'reconfigurable atom arrays, 1 ms QEC cycle, 500 µs measure/decode; error rate not in fetched text', ev: 'Analytical with heuristic logical-error model', q: 19e6, t: 5.6 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Pinnacle 26', src: 'Webster et al. 2026, Pinnacle [22]', target: 'RSA-2048', cov: 'Complete (Gidney 2025 circuit)', L: '1,399 (reused)', T: '6.5·10⁹ Toffoli (reused)', phys: '135 k (≤ 1 week), 94 k (≤ 1 month), 381 k (≤ 1 day) at 1 µs, p = 10⁻³; 53 k–141 k at 10⁻⁴; 871 k (≤ 1 year) at 1 ms', time: 'see qubits; the paper gives formulas only', hw: 'generalised bicycle qLDPC codes, 15-to-1 magic engine, quasi-local non-planar couplers; real-time decoder out of scope', ev: 'Compilation-based analysis; preprint; no code link found', p: 1e-3, q: 135000, t: 7 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Cain 26 (fast)', src: 'Cain et al. 2026 [23]', target: 'RSA-2048', cov: 'Complete, 90 % success target', L: 'Gidney 2025 / Gidney–Ekerå circuits', T: 'reused', phys: '≈102,000 (fast) · ≈68,000 · 13,255 · 11,033 (space-efficient)', time: '≈97 days · ≈870 days · ≈1.0·10⁴ days · ≈4.3·10⁴ days', hw: 'lifted-product qLDPC memory, bb18 processor, cultivation + 8T→CCZ, p = 0.048–0.093 %, 1 ms cycle (flagged as requiring development), reconfigurable non-local', ev: 'Analytical/numerical; some constructions depend on forthcoming work; figure-to-configuration mapping uncertain in extraction', p: 7e-4, q: 102000, t: 97 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Cain 26 (small)', src: 'Cain et al. 2026, space-efficient [23]', target: 'RSA-2048', cov: 'Complete, 90 % success target', L: 'Gidney 2025 circuit', T: 'reused', phys: '11,033', time: '≈4.3·10⁴ days (≈120 years)', hw: 'as above', ev: 'A qubit-count reduction, not a cost reduction: ≈470 Mqubit-days', q: 11033, t: 4.3e4 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Xue 26', src: 'Xue & Covey 2026 [24]', target: 'RSA-2048', cov: 'Complete; 190.4 days per shot × 9.2 shots', L: 'Gidney-style compilation', T: '≈7.1 M modular additions; depth 2.25·10¹⁰', phys: '≈367,500 (6 modules, d = 25) + ≈10⁵ memory ≈ “half a million”', time: '190.4 days per shot; QGPU variant 37.3 days total', hw: 'modular neutral atoms, p = 10⁻³, 1 ms measurement, 10⁵ Bell pairs/s (stated as far beyond demonstrations)', ev: 'Analytical with custom simulator (not stated as released); minor internal inconsistencies', p: 1e-3, q: 467500, t: 190.4 * 86400},
  {grp: 'RSA-2048', alg: 'rsa', tag: 'Pappalardo 26*', src: 'Pappalardo et al. 2026 [25]', target: 'RSA-2048', cov: 'Complete (abstract only)', L: '1,433 (secondary source only)', T: '7.6·10⁸ Toffoli per run, 9.6 runs (secondary source only)', phys: '≈22,593 cat qubits; 611,000 for 1.25 h', time: '3.14 days', hw: 'repetition-cat and LDPC-cat codes, phase-flip 5·10⁻⁴, ≈100-year bit-flip time, 1 µs / 10 µs', ev: 'Not verified: PDF blocked, abstract page only', q: 22593, t: 3.14 * 86400},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Roetteler 17', src: 'Roetteler et al. 2017 [3]', target: 'P-256', cov: 'Complete = 2n controlled point additions; exceptional cases ignored', L: '2,330 (Häner et al. later cite 2,338)', T: '1.26·10¹¹ Toffoli; depth 1.16·10¹¹', phys: '—', time: '—', hw: 'logical level', ev: 'Controlled point addition compiled and classically simulated in LIQUi|⟩; number of test inputs not stated'},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Häner 20', src: 'Häner et al. 2020 [26]', target: 'P-256', cov: 'Complete = windowed addition × 2n / window', L: '2,124 (Low-W) · 2,619 (Low-T) · 2,871 (Low-D)', T: 'Low-D: 1.34·2³² T-count, 1.40·2³⁴ total; T-depth 1.12·2²⁴', phys: '—', time: '—', hw: 'logical level', ev: 'Full Q# implementation with unit tests and automatic resource estimation; Low-W / Low-T gate columns garbled in the review’s PDF extraction'},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Litinski 23', src: 'Litinski 2023 [27]', target: '256-bit prime curve', cov: 'Complete, per key, with k parallel instances', L: '3,000 memory + 3,000 factories', T: '(44 + 65/k) M Toffoli per key: 109 M at k = 1, 44 M as k → ∞ (title’s “50 M” relies on batching)', phys: '9.4 M (2D baseline, d = 28); 6.9 M (active volume)', time: '3.8 h at 1 µs / 160 days at 1 ms (2D); 58 s at 1 µs (active volume)', hw: 'surface code, error rate 10 % of threshold, p_L = 10^(−d/2)', ev: 'Analytical counting from Litinski–Nickerson subroutine costs; “300–700×” vs “240×” inconsistency noted', p: 1e-3, q: 9.4e6, t: 3.8 * 3600},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Gouzien 23 (cat)', src: 'Gouzien et al. 2023 [20]', target: '256-bit prime curve', cov: 'Complete', L: '9n + w_e + 4 = 2,308 + w_e', T: '348n³/w_e Toffoli (leading order)', phys: '126,133 cat qubits', time: '9 h', hw: 'repetition cat code, κ₁/κ₂ = 10⁻⁵, 500 ns, ≈19 photons', ev: 'Exact gate and qubit counting by code; no simulation', q: 126133, t: 9 * 3600},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'CFS 26', src: 'Chevignard, Fouque, Schrottenloher 2026 [28]', target: 'P-256', cov: 'Per run; 22 runs', L: '1,193 (3.12n + o(n)); other versions quote 1,098 or ≈1,100', T: '2^38.98 Toffoli per run', phys: '—', time: '—', hw: 'logical level', ev: 'Analytical; qubit count relies on heuristic assumptions; P-224/P-256 swap corrected in the abstract'},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Babbush 26', src: 'Babbush et al. 2026 (Google) [29]', target: 'secp256k1', cov: 'Complete, single instance; success probability not given', L: '< 1,200 or < 1,450', T: '< 90 M or < 70 M Toffoli', phys: '“fewer than half a million”', time: '18 or 23 min; ≈9 / 12 min with precomputation', hw: 'surface code, p = 10⁻³, planar superconducting', ev: 'Circuits withheld; zero-knowledge proof of the point addition on 9,000 random inputs (v1 verifier bypassed by Trail of Bits, patched; estimates stated to stand)', p: 1e-3, q: 5e5, t: 23 * 60},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Luo 26', src: 'Luo et al. 2026 [30]', target: 'P-256 class', cov: 'Complete; repetitions not reported', L: '835 (3n + 6⌊log₂n⌋ + O(1))', T: '2^30.88 Toffoli (1056n³/log₂n)', phys: '—', time: '—', hw: 'logical level; mid-circuit measurement and feed-forward', ev: 'Qiskit for 64–512 bits; no repository found; supersedes arXiv:2604.02311'},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Schrottenloher 26', src: 'Schrottenloher 2026 [31]', target: 'secp256k1 and any 256-bit prime', cov: 'Complete = 28 × (3·2¹⁶ + Q_A); one run, success > 1/2', L: '1,192 (space) / 1,446 (gate) + 16', T: 'any prime: 2^26.66 / 2^26.33 Toffoli (CCX + CCZ + And)', phys: '—', time: '—', hw: 'logical level; semiclassical QFT, measurement-based unlookup', ev: 'Open Python library (Qarton), non-gate-level simulation; windowed addition tested on 10,000 random inputs'},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'IonQ 26', src: 'Häner et al. 2026 (IonQ) [32]', target: 'secp256k1', cov: 'Complete, fully compiled; logical failure ≈26.45 % per attempt, single-run success 40.7–63.3 %', L: '≈1,450 (1,457 / 1,462 incl. window qubits)', T: '≈40·10⁶ Toffoli; 75,251,329 measurement layers', phys: '19,397 ions', time: '25.69 days (upper bound)', hw: '“Walking Cat” qLDPC [[102,22,9]] blocks, 4 CCZ factories, two-qubit error 10⁻⁴, trapped ions', ev: 'Fully compiled with a rigorous logical-failure bound; circuits withheld', p: 1e-4, q: 19397, t: 25.69 * 86400},
  {grp: 'ECC-256 (P-256 / secp256k1)', alg: 'ecc', tag: 'Cain 26', src: 'Cain et al. 2026 [23]', target: '“P-256” (uses Google’s secp256k1 circuits)', cov: 'Complete, 90 % target', L: '1,200 / 1,450 (cited)', T: '9.0·10⁷ / 7.0·10⁷ Toffoli (cited)', phys: '9,739 · 11,961 · ≈19,000 · ≈26,000 atoms', time: '≈10³ days · ≈264 days · ≈52 days · ≈10 days (abstract says “a few days”)', hw: 'neutral atoms, qLDPC, 1 ms cycle', ev: 'Theoretical; curve naming mismatch with the source circuits', p: 7e-4, q: 26000, t: 10 * 86400},
  {grp: 'AES-128', alg: 'aes', tag: 'Grassl 16', src: 'Grassl et al. 2016 [5]', target: 'AES-128', cov: 'Complete Grover search', L: '2,953', T: '≈1.19·2⁸⁶ T-gates; ≈2⁸¹ T-depth', phys: '—', time: '—', hw: 'logical level; infeasible under any MAXDEPTH', ev: 'Not covered by the literature review; retained from the original page'},
];
/* Published counts for single operations (settings II–IV), from the review. */
const OP_ANCHORS = {
  'ecc:II': [
    {src: 'Häner et al. 2020, App. E Table 5 [26]', what: 'one point addition, P-256, manual compilation', L: '2,319', T: '8,176,739 T-count; T-depth 50,253', ev: 'Q# unit tests'},
    {src: 'Häner et al. 2020, App. E Table 5 [26]', what: 'one point addition, P-256, automatic compilation', L: '394,588', T: '1,576,296 T-count; T-depth 1,542', ev: 'Q# unit tests'},
  ],
  'ecc:III': [
    {src: 'Schrottenloher 2026, Table 1 [31]', what: 'one windowed addition |i⟩|R⟩ → |i⟩|R + P_i⟩, secp256k1 (excl. window: +16 qubits, +3·2^w Toffoli)', L: '1,192 (space) / 1,446 (gate)', T: '2^21.19 / 2^20.83 Toffoli', ev: '10,000 random inputs; failure ≤ 2^−13.3'},
    {src: 'Schrottenloher 2026, Table 1 [31]', what: 'one windowed addition, any 256-bit prime', L: '1,192 / 1,446', T: '2^21.78 / 2^21.42 Toffoli', ev: 'as above'},
    {src: 'ECDSA.Fail windowed-compatible variant [33]', what: 'windowed-compatible point addition, secp256k1', L: '1,162', T: '≈1,684,161 Toffoli (+29.6 % over the classical-addend circuit)', ev: 'pass rate 0.99809 on 100,000 inputs; authors state it is “not a full-Shor success estimate”'},
  ],
  'ecc:IV': [
    {src: 'ECDSA.Fail README anchors [33]', what: 'initial circuit: uncontrolled in-place affine addition of a classical point, secp256k1', L: '2,715', T: '3,942,753 Toffoli (score ≈1.07·10¹⁰)', ev: '9,024 Fiat–Shamir-derived test points; Q × Toffoli score'},
    {src: 'ECDSA.Fail README anchors [33]', what: 'Google low-qubit / low-gate point addition (as reported by the benchmark)', L: '1,175 / 1,425', T: '2.7 M / 2.1 M Toffoli', ev: 'ZK-attested on 9,000 inputs; not located in the paper’s extractable main text'},
    {src: 'ECDSA.Fail paper, cutoff 26 July 2026 [33]', what: 'best leaderboard entry', L: '1,151', T: '1,299,453 Toffoli (score ≈1.496·10⁹)', ev: 'benchmark harness; Pareto points down to 825 qubits'},
    {src: 'ECDSA.Fail post-cutoff entry [33]', what: 'first entry below one million Toffoli', L: '1,321', T: '952,707 Toffoli', ev: 'benchmark harness'},
    {src: 'Luo et al. 2026, §6 [30]', what: 'point addition, n = 256 class (formula)', L: '3n + 6⌊log₂n⌋ + 19', T: '1051 n² Toffoli; inversion 229 n²', ev: 'Qiskit'},
  ],
  'rsa:IV': [
    {src: 'Kahanamoku-Meyer & Yao 2024, Table II [34]', what: 'one classical–quantum modular multiplication of 2048-bit numbers, Toom–Cook / QFT', L: '79–80 ancillae', T: '0.6 M Toffoli (standard QFT) / 0.9 M (phase gradient)', ev: 'analytical with resource-estimation code; compare Karatsuba 5.6 M Toffoli / 12,730 ancillae and windowed 1.8 M / 4,106'},
  ],
};
const OP_RULE = {ecc: 'For the windowed 256-bit circuits the complete attack follows the published rule Toffoli_ECDLP ≈ (2n/w − 4) × (Toffoli_PA + 3·2^w) with w = 16, i.e. 28 × (3·2¹⁶ + Q_A), qubits ≈ Q + 16 (ECDSA.Fail Eq. 11; Schrottenloher Formula 1; IonQ uses the same form). It assumes a quantum-index windowed addition with three 2^w lookups, exceptional cases neglected except at i = 0, a semiclassical QFT with one recycled control qubit, per-call failure compounded over 28 calls, and ≈1/p repetitions for a single-run success p. The benchmark paper says instantiating the complete 28-call schedule “remains future work”.'};
/* Estimation settings I–IV: what the number describes, per algorithm family. */
const SHOR_MULT = (attackName, attackGoal) => [
  {id: 'I', name: attackName, task: 'The full attack, including the required quantum computations, repetitions, and classical processing', goal: attackGoal},
  {id: 'II', name: 'Controlled constant multiplication', task: 'One multiplication by a known A, conditional on c', goal: '|c, y⟩ ↦ |c, A<sup>c</sup>·y mod N⟩'},
  {id: 'III', name: 'Window/table-selected multiplication', task: 'One multiplication by a constant selected coherently by quantum address J, including lookup and cleanup', goal: '|J, y⟩ ↦ |J, A<sub>J</sub>·y mod N⟩'},
  {id: 'IV', name: 'Fixed constant multiplication', task: 'One unconditional multiplication by a known A', goal: '|y⟩ ↦ |A·y mod N⟩'},
];
const SETTINGS = {
  rsa: SHOR_MULT('Complete factoring attack', 'Recover the factors of N, enabling recovery of the RSA private key'),
  ffdlp: SHOR_MULT('Complete discrete-log attack', 'Recover the discrete logarithm x from g<sup>x</sup> mod p, enabling recovery of the DH/DSA private key'),
  ecc: [
    {id: 'I', name: 'Complete discrete-log attack', task: 'The paper’s complete discrete-log attack model: the full Shor computation, repetitions, and classical post-processing', goal: 'Recover the scalar k from Q = kP, enabling recovery of the ECC private key'},
    {id: 'II', name: 'Controlled point addition', task: 'One addition of a classical point, conditional on a quantum control', goal: '|c, R⟩ ↦ |c, R + c·P⟩'},
    {id: 'III', name: 'Window/table-selected point addition', task: 'One coherently selected table-point addition, including the specified lookup and cleanup', goal: '|J, R⟩ ↦ |J, R + P<sub>J</sub>⟩'},
    {id: 'IV', name: 'Fixed point addition', task: 'One addition of a fixed classical point (the ECDSA.Fail benchmark operation)', goal: '|R⟩ ↦ |R + P⟩'},
  ],
  aes: [
    {id: 'I', name: 'Complete key-recovery attack', task: 'Preparation, many Grover iterations, measurement, and candidate verification', goal: 'Recover the secret AES key'},
    {id: 'II', name: 'One Grover iteration', task: 'One key-checking phase oracle followed by the diffusion operation', goal: 'Increase the amplitude of matching candidate keys'},
    {id: 'III', name: 'One key-checking phase oracle', task: 'Evaluate AES, compare against known ciphertexts, apply a conditional phase, and uncompute temporary information', goal: '|k⟩ ↦ (−1)<sup>f(k)</sup>|k⟩, where f(k) = 1 when the key matches all tested pairs'},
    {id: 'IV', name: 'One reversible AES evaluation', task: 'Evaluate AES coherently with a candidate key in a quantum register', goal: 'Compute AES<sub>k</sub>(P) for a known plaintext P, with the specified output and cleanup requirements'},
  ],
};
let SETTING = 'I';
const WINDOWED = new Set(['schrott2026', 'babbush2026', 'ionq2026']);
/* One operation of the chosen setting, derived from the complete attack.
   Windowed 256-bit circuits use the published 28-call rule; the rest use placeholder ratios. */
function opView(s, full) {
  const n = s.keyBits;
  if (full.kind === 'grover') {
    const pairs = n === 256 ? 3 : 2;                       // plaintext–ciphertext pairs checked by the oracle
    const perIter = full.T / full.iters;
    const f = {II: 1, III: 0.97, IV: 0.97 / (2 * pairs)}[SETTING];
    return {T: perIter * f, L: full.L, count: SETTING === 'IV' ? full.iters * 2 * pairs : full.iters, unit: 'T-depth', rule: 'placeholder ratio',
      opsLabel: {II: 'Grover iterations', III: 'oracle calls', IV: 'AES evaluations'}[SETTING]};
  }
  const ops = 2 * n;                                        // controlled multiplications / point additions in the exponentiation
  const w = s.alg === 'ecc' ? 16 : 5;
  if (s.alg === 'ecc' && WINDOWED.has(s.variant)) {
    const calls = 2 * n / w - 4;                            // 28 windowed additions for n = 256, w = 16
    const perWin = full.T / calls;                          // = 3·2^w + Q_A
    const f = {II: 1 / ops, III: 1, IV: 1 / 1.296}[SETTING];
    return {T: SETTING === 'II' ? full.T * f : perWin * f, L: SETTING === 'III' ? full.L : full.L - 16, count: SETTING === 'II' ? ops : calls, unit: 'Toffoli gates',
      rule: SETTING === 'III' ? 'published rule: attack = (2n/w − 4) × (Toffoli_PA + 3·2^w)' : SETTING === 'IV' ? 'windowed addition ÷ 1.296 (ECDSA.Fail measured overhead)' : 'placeholder ratio', opsLabel: SETTING === 'III' ? 'windowed point additions' : 'point additions'};
  }
  const f = {II: 1 / ops, III: w / ops, IV: 0.9 / ops}[SETTING];
  return {T: full.T * f, L: full.L, count: SETTING === 'III' ? ops / w : ops, unit: 'Toffoli gates', rule: 'placeholder ratio', opsLabel: s.alg === 'ecc' ? 'point additions' : 'modular multiplications'};
}
const $ = id => document.getElementById(id);
const pFromSlider = v => Math.pow(10, -4 + 2 * v / 100);
const sliderFromP = p => Math.round((Math.log10(p) + 4) / 2 * 100);

function readSettings() {
  return {
    alg: $('alg').value, keyBits: +$('keyBits').value, variant: $('variant').value,
    arithOpt: +$('arithOpt').value, parallel: +$('parallel').value, machines: +$('machines').value, window: +$('window').value,
    pPhys: pFromSlider(+$('pPhys').value), cycleUs: +$('cycleUs').value, reactionUs: +$('reactionUs').value,
    manualD: !$('dAuto').checked, d: +$('d').value, eps: +$('eps').value,
    factories: +$('factories').value, magic: $('magic').value, storage: $('storage').value, routing: +$('routing').value,
    q0: +$('q0').value, doubling: +$('doubling').value,
    engine: ENGINE_WANT, qModel: $('qModel').value, qec: $('qec').value, qGate: +$('qGate').value, qMeas: +$('qMeas').value,
    maxTF: +$('maxTF').value, depthFactor: +$('depthFactor').value,
  };
}
function fillSelect(sel, pairs, keep) {
  const prev = sel.value;
  sel.innerHTML = pairs.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  sel.value = keep && pairs.some(p => String(p[0]) === prev) ? prev : pairs[0][0];
}
function syncKeys() {
  const alg = $('alg').value, v = variantOf(alg, $('variant').value);
  fillSelect($('keyBits'), keysFor(alg, v.id).map(k => [k, k + '-bit']), true);
  $('keyHint').textContent = ALGS[alg].hint + (v.keys ? ' · published for ' + v.keys.join(', ') + '-bit only' : '');
  $('variantNote').textContent = v.note;
}
function syncAlgUI() {
  const a = ALGS[$('alg').value];
  fillSelect($('variant'), a.variants.map(v => [v.id, v.label]), true);
  $('variantHint').textContent = a.vhint;
  syncKeys();
  document.querySelectorAll('[data-only]').forEach(el => el.hidden = el.dataset.only !== $('alg').value);
}
function syncQec() {
  fillSelect($('qec'), qdkQecFor($('qModel').value).map(k => [k, QDK_QEC[k]]), true);
  const qm = $('qModel').value; $('qModelHint').textContent = (QDK_MODELS[qm].custom ? 'Uses ' : 'QDK preset ' + qm + ': ') + QDK_MODELS[qm].note + '.';
}
/* Keep the quick-pick select in step with the family / circuit / size controls. */
function syncDeployed() {
  const alg = $('alg').value, variant = $('variant').value, keyBits = +$('keyBits').value;
  const cur = DEPLOYED_FLAT.find(d => d.id === DEPLOY_ID);
  if (!cur || cur.alg !== alg || cur.variant !== variant || cur.keyBits !== keyBits) {
    const m = DEPLOYED_FLAT.find(d => d.alg === alg && d.variant === variant && d.keyBits === keyBits);
    DEPLOY_ID = m ? m.id : '';
  }
  $('deployed').value = DEPLOY_ID;
}
function applyDeployed(id) {
  const d = DEPLOYED_FLAT.find(x => x.id === id); if (!d) return;
  DEPLOY_ID = id;
  $('alg').value = d.alg; syncAlgUI();
  $('variant').value = d.variant; syncKeys();
  $('keyBits').value = d.keyBits;
  if (document.body.dataset.ready) renderAll();
}
function applyPreset(s) {
  $('qModel').value = s.qModel; syncQec(); $('qec').value = s.qec; $('qGate').value = s.qGate; $('qMeas').value = s.qMeas; $('maxTF').value = s.maxTF; $('depthFactor').value = s.depthFactor;
  $('alg').value = s.alg; syncAlgUI();
  $('variant').value = s.variant; syncKeys();
  $('keyBits').value = s.keyBits;
  $('pPhys').value = sliderFromP(s.pPhys); $('cycleUs').value = s.cycleUs; $('reactionUs').value = s.reactionUs;
  $('factories').value = s.factories; $('magic').value = s.magic; $('storage').value = s.storage; $('routing').value = s.routing;
  $('eps').value = s.eps; $('parallel').value = s.parallel; $('arithOpt').value = s.arithOpt; $('window').value = s.window; $('machines').value = s.machines;
  $('dAuto').checked = true;
  if (document.body.dataset.ready) renderAll();
}

/* SVG helpers */
const svgEl = (tag, attrs, text) => { let s = `<${tag}`; for (const k in attrs) s += ` ${k}="${attrs[k]}"`; return text != null ? `${s}>${text}</${tag}>` : `${s}/>`; };
const logTicks = (lo, hi) => { const t = []; for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) t.push(Math.pow(10, e)); return t; };
const sup = e => '10' + String(e).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
/* Place anchor labels so that they do not overlap each other (greedy: try a few offsets, then push down). */
function placeLabels(items, W, obstacles = []) {
  const boxes = obstacles.map(o => ({x0: o.x - o.r, x1: o.x + o.r, y0: o.y - o.r, y1: o.y + o.r})), out = [];
  const cands = [[9, -7, 'start'], [9, 15, 'start'], [-9, -7, 'end'], [-9, 15, 'end'], [9, 27, 'start'], [-9, 27, 'end']];
  const hits = (x0, x1, y0, y1) => boxes.some(b => !(x1 < b.x0 || x0 > b.x1 || y1 < b.y0 || y0 > b.y1));
  items.forEach(it => {
    const w = it.text.length * 6.2, h = 11;
    let best = null;
    for (const c of cands) {
      const x = it.x + c[0], y = it.y + c[1], x0 = c[2] === 'start' ? x : x - w;
      if (x0 < 4 || x0 + w > W - 4) continue;
      if (!hits(x0, x0 + w, y - h, y)) { best = {x, y, anchor: c[2], x0, x1: x0 + w, y0: y - h, y1: y}; break; }
    }
    if (!best) { const x = it.x + 9, x0 = x; let y = it.y - 7; while (hits(x0, x0 + w, y - h, y)) y += 12; best = {x, y, anchor: 'start', x0, x1: x0 + w, y0: y - h, y1: y}; }
    boxes.push(best); out.push({...it, lx: best.x, ly: best.y, anchor: best.anchor});
  });
  return out;
}

function chartP(s, cur) {
  const W = 520, H = 300, m = {l: 54, r: 16, t: 24, b: 36};
  const xs = [], pts = [], qdk = cur.engine === 'qdk', N = qdk ? 24 : 60;
  for (let i = 0; i <= N; i++) { const p = Math.pow(10, -4 + 1.9 * i / N); const r = qdk ? estimateQdk(s, {p}) : estimate({...s, pPhys: p, manualD: false}); if (isFinite(r.phys)) pts.push([p, r.phys]); }
  const pNow = qdk ? qdkNominalP(s) : s.pPhys;
  const anchors = ANCHORS.filter(a => a.q && a.p && a.alg === s.alg);
  const ys = pts.map(p => p[1]).concat(anchors.map(a => a.q), [cur.phys].filter(isFinite));
  if (!ys.length) { $('chartP').innerHTML = svgEl('text', {x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'lbl'}, 'No finite estimate in this range'); return; }
  const ylo = Math.pow(10, Math.floor(Math.log10(Math.min(...ys)))), yhi = Math.pow(10, Math.ceil(Math.log10(Math.max(...ys))));
  const X = p => m.l + (Math.log10(p) + 4) / 2 * (W - m.l - m.r);
  const Y = q => H - m.b - (Math.log10(q) - Math.log10(ylo)) / (Math.log10(yhi) - Math.log10(ylo)) * (H - m.t - m.b);
  let g = '';
  let yt = logTicks(ylo, yhi); if (yt.length > 8) yt = yt.filter((_, i) => i % 2 === 0);
  yt.forEach(t => { g += svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid'}); g += svgEl('text', {x: m.l - 6, y: Y(t) + 3, 'text-anchor': 'end'}, sup(Math.log10(t))); });
  [1e-4, 1e-3, 1e-2].forEach(t => { g += svgEl('line', {x1: X(t), x2: X(t), y1: H - m.b, y2: H - m.b + 4, class: 'axis'}); g += svgEl('text', {x: X(t), y: H - m.b + 16, 'text-anchor': 'middle'}, sup(Math.log10(t))); });
  g += svgEl('text', {x: W - m.r, y: H - 4, 'text-anchor': 'end'}, 'physical error rate');
  g += svgEl('text', {x: 6, y: 10}, 'physical qubits');
  if (pts.length) {
    g += svgEl('path', {class: 'area', d: `M${X(pts[0][0])},${H - m.b} ` + pts.map(p => `L${X(p[0])},${Y(p[1])}`).join(' ') + ` L${X(pts[pts.length - 1][0])},${H - m.b} Z`});
    g += svgEl('path', {class: 'ln a', d: pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ',' + Y(p[1])).join(' ')});
  }
  placeLabels(anchors.map(a => ({x: X(a.p), y: Y(a.q), text: a.tag})), W).forEach(a => { g += svgEl('circle', {class: 'mk g', cx: a.x, cy: a.y, r: 4.5}); g += svgEl('text', {class: 'lbl', x: a.lx, y: a.ly, 'text-anchor': a.anchor}, a.text); });
  if (isFinite(cur.phys) && pNow >= 1e-4 && pNow <= 1e-2) { const left = X(pNow) < m.l + 60; g += svgEl('circle', {class: 'mk a', cx: X(pNow), cy: Y(cur.phys), r: 5}); g += svgEl('text', {class: 'lbl', x: X(pNow) + (left ? 8 : -8), y: Y(cur.phys) - 8, 'text-anchor': left ? 'start' : 'end'}, fmtN(cur.phys)); }
  $('chartP').innerHTML = g;
}
function chartQ(s, cur) {
  const W = 520, H = 300, m = {l: 54, r: 16, t: 24, b: 36};
  const y0 = YEAR0, y1 = 2050;
  const ylo = 1e3, yhi = Math.pow(10, Math.max(8, Math.ceil(Math.log10(isFinite(cur.phys) ? cur.phys * 2 : 1e8))));
  const X = y => m.l + (y - y0) / (y1 - y0) * (W - m.l - m.r);
  const Y = q => H - m.b - (Math.log10(q) - 3) / (Math.log10(yhi) - 3) * (H - m.t - m.b);
  let g = '';
  logTicks(ylo, yhi).forEach(t => { g += svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid'}); g += svgEl('text', {x: m.l - 6, y: Y(t) + 3, 'text-anchor': 'end'}, sup(Math.log10(t))); });
  for (let y = y0; y <= y1; y += 4) g += svgEl('text', {x: X(y), y: H - m.b + 16, 'text-anchor': 'middle'}, y);
  g += svgEl('text', {x: 6, y: 10}, 'physical qubits');
  [2030, 2035].forEach(y => g += svgEl('line', {class: 'ln g', x1: X(y), x2: X(y), y1: m.t, y2: H - m.b}));
  const hw = []; for (let y = y0; y <= y1; y += 0.5) { const q = s.q0 * Math.pow(2, (y - y0) / s.doubling); if (q <= yhi) hw.push([y, q]); }
  g += svgEl('path', {class: 'ln b', d: hw.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ',' + Y(p[1])).join(' ')});
  if (isFinite(cur.phys) && cur.phys >= ylo) {
    g += svgEl('line', {class: 'ln a', x1: m.l, x2: W - m.r, y1: Y(cur.phys), y2: Y(cur.phys)});
    const qd = qDay(cur.phys, s.q0, y0, s.doubling);
    if (qd <= y1) { g += svgEl('circle', {class: 'mk a', cx: X(qd), cy: Y(cur.phys), r: 5}); g += svgEl('text', {class: 'lbl', x: X(qd) + (qd > 2042 ? -8 : 8), y: Y(cur.phys) - 8, 'text-anchor': qd > 2042 ? 'end' : 'start'}, 'Q-day ≈ ' + qd.toFixed(0)); }
    else g += svgEl('text', {class: 'lbl', x: W - m.r, y: Y(cur.phys) - 6, 'text-anchor': 'end'}, 'Q-day beyond 2050');
  }
  $('chartQ').innerHTML = g;
}
const TIME_TICKS = [[1, '1 s'], [60, '1 min'], [3600, '1 h'], [86400, '1 d'], [604800, '1 wk'], [2.63e6, '1 mo'], [3.156e7, '1 y'], [3.156e8, '10 y'], [3.156e9, '100 y'], [3.156e10, '1k y'], [3.156e11, '10k y'], [3.156e12, '100k y'], [3.156e13, '1M y'], [3.156e14, '10M y'], [3.156e15, '100M y'], [3.156e16, '1B y'], [3.156e17, '10B y'], [3.156e19, '1T y']];
/* Space–time frontier: runtime (x) against physical qubits (y) for the complete attack, traced by the factory count (machines for Grover). */
function chartTO(s, cur) {
  const W = 1040, H = 400, m = {l: 64, r: 24, t: 26, b: 40};
  const grover = cur.kind === 'grover', qdk = cur.engine === 'qdk';
  const sweep = []; const seen = new Set();
  if (qdk) qdkFrontier(s).forEach(q => sweep.push({F: q.factories, x: q.runtime, y: q.phys}));
  else for (let i = 0; i <= 60; i++) {
    const k = Math.round(Math.pow(10, (grover ? 6 : 3) * i / 60));
    if (seen.has(k)) continue; seen.add(k);
    const r = estimate(grover ? {...s, machines: k, manualD: false} : {...s, factories: k, manualD: false});
    if (!isFinite(r.phys) || !isFinite(r.runtime)) continue;
    const prev = sweep[sweep.length - 1];
    if (prev && r.runtime > prev.x * 0.99) break;            // reaction-time floor reached: more factories only add qubits
    sweep.push({F: k, x: r.runtime, y: r.phys});
  }
  const others = keysFor(s.alg, s.variant).filter(k => k !== s.keyBits).map(k => { const r = estimateAny({...s, keyBits: k, manualD: false}); return {k, x: r.runtime, y: r.phys}; }).filter(o => isFinite(o.x) && isFinite(o.y));
  const anchors = ANCHORS.filter(a => a.q && a.t && a.alg === s.alg);
  const curOk = isFinite(cur.phys) && isFinite(cur.runtime);
  const qre = qdk && s.arithOpt === 1 ? qreRunsFor(s).filter(x => x.arch === QRE_ARCH[s.qModel]).flatMap(x => x.results) : [];
  $('legQre').hidden = !qre.length;
  const xs = sweep.map(p => p.x).concat(others.map(o => o.x), anchors.map(a => a.t), qre.map(q => q.runtime_s), curOk ? [cur.runtime] : []);
  const ys = sweep.map(p => p.y).concat(others.map(o => o.y), anchors.map(a => a.q), qre.map(q => q.qubits), [s.q0], curOk ? [cur.phys] : []);
  if (!xs.length) { $('chartTO').innerHTML = svgEl('text', {x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'lbl'}, 'No finite estimate at this error rate'); window.__to = null; return; }
  const lg = Math.log10;
  const xlo = Math.pow(10, Math.floor(lg(Math.min(...xs)))), xhi = Math.pow(10, Math.ceil(lg(Math.max(...xs))));
  const ylo = Math.pow(10, Math.floor(lg(Math.min(...ys)))), yhi = Math.pow(10, Math.ceil(lg(Math.max(...ys))));
  const X = v => m.l + (lg(v) - lg(xlo)) / Math.max(1e-9, lg(xhi) - lg(xlo)) * (W - m.l - m.r);
  const Y = v => H - m.b - (lg(v) - lg(ylo)) / Math.max(1e-9, lg(yhi) - lg(ylo)) * (H - m.t - m.b);
  let g = '';
  let yt = logTicks(ylo, yhi); if (yt.length > 9) yt = yt.filter((_, i) => i % 2 === 0);
  yt.forEach(t => { g += svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), class: 'grid'}); g += svgEl('text', {x: m.l - 8, y: Y(t) + 3, 'text-anchor': 'end'}, sup(Math.round(lg(t)))); });
  let xt = TIME_TICKS.filter(t => t[0] >= xlo && t[0] <= xhi); if (xt.length > 10) xt = xt.filter((_, i) => i % 2 === 0);
  xt.forEach(t => { g += svgEl('line', {x1: X(t[0]), x2: X(t[0]), y1: m.t, y2: H - m.b, class: 'grid'}); g += svgEl('text', {x: X(t[0]), y: H - m.b + 16, 'text-anchor': 'middle'}, t[1]); });
  g += svgEl('text', {x: 8, y: 11}, 'physical qubits');
  g += svgEl('text', {x: W - m.r, y: H - 4, 'text-anchor': 'end'}, 'runtime per run (log)');
  // largest machine today
  g += svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(s.q0), y2: Y(s.q0), stroke: 'var(--muted)', 'stroke-dasharray': '2 4', 'stroke-width': 1.5});
  g += svgEl('text', {x: m.l + 6, y: Y(s.q0) - 6, 'text-anchor': 'start'}, `largest machine today · ${fmtN(s.q0)}`);
  let endLabel = null;
  if (sweep.length) {
    const pts = sweep.slice().sort((a, b) => a.x - b.x);
    g += svgEl('path', {class: 'area', d: `M${X(pts[0].x)},${H - m.b} ` + pts.map(p => `L${X(p.x)},${Y(p.y)}`).join(' ') + ` L${X(pts[pts.length - 1].x)},${H - m.b} Z`});
    g += svgEl('path', {class: 'ln a', d: pts.map((p, i) => (i ? 'L' : 'M') + X(p.x) + ',' + Y(p.y)).join(' ')});
    if (pts.length > 1) { const e2 = pts[pts.length - 1]; endLabel = {x: X(e2.x), y: Y(e2.y), text: `${e2.F} ${grover ? plural(e2.F, 'machine', 'machines') : (qdk ? 'T ' : '') + plural(e2.F, 'factory', 'factories')} (slowest)`}; }
  }
  /* markers first, then every label placed so that it clears the markers and the other labels */
  const labels = [], obstacles = [];
  if (curOk) { labels.push({x: X(cur.runtime), y: Y(cur.phys), text: `${ALGS[s.alg].name.split(' (')[0]}-${s.keyBits} · ${fmtN(cur.phys)} qubits · ${fmtDur(cur.runtime)}`}); obstacles.push({x: X(cur.runtime), y: Y(cur.phys), r: 8}); }
  if (endLabel) labels.push(endLabel);
  others.forEach(o => { g += svgEl('circle', {class: 'mk b', cx: X(o.x), cy: Y(o.y), r: 5}); labels.push({x: X(o.x), y: Y(o.y), text: `${o.k}-bit`}); obstacles.push({x: X(o.x), y: Y(o.y), r: 7}); });
  anchors.forEach(a => { g += svgEl('circle', {class: 'mk g', cx: X(a.t), cy: Y(a.q), r: 5}); labels.push({x: X(a.t), y: Y(a.q), text: a.tag}); obstacles.push({x: X(a.t), y: Y(a.q), r: 7}); });
  qre.forEach(q => { const cx = X(q.runtime_s), cy = Y(q.qubits); g += svgEl('path', {class: 'mk q', d: `M${cx},${cy - 5} L${cx + 5},${cy} L${cx},${cy + 5} L${cx - 5},${cy} Z`}); obstacles.push({x: cx, y: cy, r: 7}); });
  if (curOk) g += svgEl('circle', {class: 'mk a', cx: X(cur.runtime), cy: Y(cur.phys), r: 6});
  placeLabels(labels, W, obstacles).forEach(l => { g += svgEl('text', {class: 'lbl', x: l.lx, y: l.ly, 'text-anchor': l.anchor}, l.text); });
  g += svgEl('circle', {id: 'toHover', class: 'mk a', r: 6, hidden: ''});
  $('chartTO').innerHTML = g;
  window.__to = {sweep, X, Y, unit: grover ? 'machines' : qdk ? 'T factories' : 'factories'};
}
function initTradeoffHover() {
  const svg = $('chartTO'), tip = $('tipTO');
  svg.addEventListener('mousemove', e => {
    const d = window.__to; if (!d || !d.sweep.length) return;
    const rect = svg.getBoundingClientRect(), vx = (e.clientX - rect.left) / rect.width * 1040;
    let best = null, bd = Infinity;
    d.sweep.forEach(p => { const dx = Math.abs(d.X(p.x) - vx); if (dx < bd) { bd = dx; best = p; } });
    const hx = d.X(best.x), hy = d.Y(best.y), c = $('toHover');
    if (c) { c.setAttribute('cx', hx); c.setAttribute('cy', hy); c.hidden = false; }
    const t = fmtT(best.x);
    tip.textContent = `${best.F} ${d.unit} · ${t.v} ${t.u} · ${fmtN(best.y)} qubits`;
    tip.style.left = (hx / 1040 * rect.width) + 'px'; tip.style.top = (hy / 400 * rect.height) + 'px'; tip.hidden = false;
  });
  svg.addEventListener('mouseleave', () => { tip.hidden = true; const c = $('toHover'); if (c) c.hidden = true; });
}
function renderOpAnchors(s) {
  const box = $('opAnch');
  if (SETTING === 'I') { box.innerHTML = ''; box.hidden = true; return; }
  const rows = OP_ANCHORS[`${s.alg}:${SETTING}`] || [];
  const rule = s.alg === 'ecc' && SETTING !== 'II' ? `<p class="small muted">${OP_RULE.ecc}</p>` : '';
  box.hidden = false;
  box.innerHTML = `<span class="eyebrow">Published counts for this operation (literature review)</span>` + (rows.length
    ? `<div class="tbl-wrap"><table class="anch-tbl op-tbl"><thead><tr><th>Source</th><th>What is costed</th><th class="num">Logical qubits</th><th class="num">Gate count (paper's unit)</th><th>Evidence</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.src}</td><td>${r.what}</td><td class="num">${r.L}</td><td class="num">${r.T}</td><td class="muted">${r.ev}</td></tr>`).join('')}</tbody></table></div>${rule}`
    : `<p class="small muted">The review records no published count for this operation on ${ALGS[s.alg].name.split(' (')[0]}; the figure below is placeholder-scaled from the complete attack.</p>`);
}
function renderSettingUI(s) {
  const list = SETTINGS[s.alg];
  if (!list.some(x => x.id === SETTING)) SETTING = 'I';
  $('seg').innerHTML = list.map(x => `<button type="button" role="tab" data-setting-id="${x.id}" aria-selected="${x.id === SETTING}">${x.id}</button>`).join('');
  $('segName').textContent = list.find(x => x.id === SETTING).name;
  $('settingTbl').querySelector('tbody').innerHTML = list.map(x => `<tr class="${x.id === SETTING ? 'sel' : ''}"><td>${x.id}</td><td>${x.task}</td><td class="op">${x.goal}</td></tr>`).join('');
  document.querySelectorAll('[data-setting]').forEach(el => el.hidden = el.dataset.setting !== SETTING);
  renderOpAnchors(s);
}
function renderAnchorsTable(alg) {
  let last = '';
  $('anchors').querySelector('tbody').innerHTML = ANCHORS.map(a => {
    const head = a.grp !== last ? `<tr class="grp"><td colspan="6">${a.grp}</td></tr>` : '';
    last = a.grp;
    return head + `<tr class="${a.alg === alg ? 'sel' : ''}"><td class="name">${a.src}<span class="sm">${a.target} · ${a.cov}</span></td><td class="num">${a.L}</td><td class="num">${a.T}</td><td class="num">${a.phys}</td><td class="num">${a.time}</td><td class="muted">${a.hw}<span class="sm">Evidence: ${a.ev}</span></td></tr>`;
  }).join('');
}
const qreRunsFor = s => QRE.runs.filter(x => x.alg === s.alg && x.variant === s.variant && x.keyBits === s.keyBits);
const targetName = (alg, keyBits) => ALGS[alg].name.split(' (')[0] + '-' + keyBits;

/* Show the controls of the active engine and say which engine is pricing the physical layer, and why. */
function syncEngineUI(s) {
  const eng = engineFor(s), custom = s.qModel === 'custom';
  document.querySelectorAll('#estimator [data-engine]').forEach(el => { const t = el.dataset.engine.split(' '); el.hidden = !(t.includes(eng) || (eng === 'qdk' && custom && t.includes('qdk-custom'))); });
  document.querySelectorAll('#engSeg [data-engine-id]').forEach(b => b.setAttribute('aria-selected', b.dataset.engineId === ENGINE_WANT));
  const c7 = QDK.commit ? QDK.commit.slice(0, 7) : '';
  let st;
  if (ENGINE_WANT !== 'qdk') st = 'Built-in placeholder model selected.';
  else if (QDK.state === 'loading') st = 'Loading the QDK estimator (0.6 MB)… built-in figures are shown until it is ready.';
  else if (QDK.state === 'failed') st = `The QDK estimator is not running in this copy of the page (${QDK.error}); the built-in model is shown instead.`;
  else if (s.alg === 'aes') st = 'AES key search runs on the built-in model: Grover counts exceed the 64-bit integers the QDK takes.';
  else st = `QDK estimator running in this browser tab · microsoft/qdk @ ${c7} · MIT licence`;
  $('engStatus').textContent = st;
  $('engNote').innerHTML = eng === 'qdk'
    ? `<span class="pill good">QDK engine</span>&nbsp; Physical qubits, runtime, code distance and T factories are computed in your browser by the open-source Microsoft QDK resource estimator [45] from the logical counts of the chosen circuit. They describe the QDK's generic architecture, so they differ from the physical numbers each paper reports for its own. Logical counts, anchors and sub-operation counts come from the project literature review (search date 1 November 2026) and are quoted in each paper's own units.`
    : `<span class="pill warn">Provisional outputs</span>&nbsp; The physical layer shown is Q-CARE's built-in placeholder model, a uniform surface-code wrapper that reproduces no paper's physical number. Logical counts, anchors and sub-operation counts come from the project literature review (search date 1 November 2026) and are quoted in each paper's own units, with per-run and expected costs kept apart.`;
  $('capTO').innerHTML = eng === 'qdk'
    ? `<b>Runtime vs physical qubits.</b> The QDK's space–time frontier for the complete attack on the current target: each point further along the curve runs with fewer T factories and takes longer. Other key sizes of the family are shown at the QDK's fastest configuration. Published anchors are plotted at the qubits and runtime each paper reports for its own architecture (per run or expected, as listed in the table below). Hover the curve to read values.`
    : `<b>Runtime vs physical qubits.</b> The space–time frontier for the complete attack on the current target: each point on the curve is a different number of magic-state factories (parallel machines for Grover). Other key sizes of the family are shown at the current factory count. Published anchors are plotted at the runtime each paper reports (per run or expected, as listed in the table below). Hover the curve to read values.`;
  $('capP').innerHTML = eng === 'qdk'
    ? `<b>Physical qubits vs physical error rate</b> for the complete attack (setting I): the QDK rerun with the qubit model's gate, measurement and idle error rates set to each value. Anchors with a stated gate error rate are shown; cat-qubit and photonic-memory estimates have no comparable rate and are left out.`
    : `<b>Physical qubits vs physical error rate</b> for the complete attack (setting I). Anchors with a stated gate error rate are shown; cat-qubit and photonic-memory estimates have no comparable rate and are left out.`;
  return eng;
}

/* The reference function: every deployed algorithm priced under the current hardware assumptions. */
function renderComparison(s) {
  const pageEng = engineFor({...s, alg: 'rsa'});
  const cell = (main, sub) => `${main}${sub ? `<span class="sm">${sub}</span>` : ''}`;
  let html = '';
  DEPLOYED.forEach(g => {
    html += `<tr class="grp"><td colspan="7">${g.grp}</td></tr>`;
    g.items.forEach(it => {
      const si = {...s, alg: it.alg, variant: it.variant, keyBits: it.keyBits, manualD: false, machines: 1};
      const r = estimateAny(si), ok = isFinite(r.phys) && isFinite(r.runtime);
      const flags = [r.src, r.scaled && !it.note ? 'scaled from the published size' : '', it.note || ''].filter(Boolean).join(' · ');
      let status;
      if (!ok) status = cell('<span class="pill warn">No estimate</span>', escH(r.err || 'no code distance suffices at this error rate'));
      else if (r.kind === 'grover') status = cell('<span class="pill good">Holds</span>', 'Grover gives a quadratic speed-up only');
      else { const qd = qDay(r.phys, s.q0, YEAR0, s.doubling); status = cell(`<span class="pill ${qd <= 2032 ? 'bad' : qd <= 2040 ? 'warn' : ''}">Vulnerable by ≈ ${qd.toFixed(0)}</span>`, `when ${fmtN(r.phys)} qubits exist`); }
      const ex = ok && r.kind !== 'grover' ? `${r.runs} expected ${plural(r.runs, 'run', 'runs')} → ${r.engine === 'qdk' ? '≤ ' : ''}${fmtDur(r.expected)}` : '';
      html += `<tr class="${it.id === DEPLOY_ID ? 'sel' : ''}"><td class="name"><button type="button" class="linkish" data-deploy="${it.id}">${it.label}</button></td>`
        + `<td>${cell(it.attack, flags)}</td>`
        + `<td class="num">${cell(r.L.toLocaleString(), r.engine === 'qdk' && ok ? r.Llayout.toLocaleString() + ' after QDK layout' : '')}</td>`
        + `<td class="num">${cell(fmtSci(r.T), r.unit)}</td>`
        + `<td class="num">${ok ? cell(fmtN(r.phys), `d = ${r.d}${r.engine === 'qdk' ? ` · ${r.factories} T ${plural(r.factories, 'factory', 'factories')}` : pageEng === 'qdk' ? ' · built-in model' : ''}`) : '—'}</td>`
        + `<td class="num">${ok ? cell(fmtDur(r.runtime) + (r.kind === 'grover' ? '' : ' per run'), ex) : '—'}</td>`
        + `<td>${status}</td></tr>`;
    });
  });
  html += `<tr class="grp"><td colspan="7">Post-quantum · no known quantum break</td></tr>`
    + `<tr><td class="name">ML-KEM, ML-DSA, SLH-DSA, HQC</td><td>${cell('No quantum attack below the claimed security level is known', 'the review found subroutine circuits and model-based security levels only; see “Beyond RSA and ECC” below and the <a href="#pqc">PQC Benchmark Suite</a>')}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td>${cell('<span class="pill good">No known quantum break</span>', 'no complete attack exists to price')}</td></tr>`;
  $('cmpTbl').querySelector('tbody').innerHTML = html;
  const m = QDK_MODELS[s.qModel] || QDK_MODELS.qubit_gate_ns_e3;
  $('cmpIntro').innerHTML = pageEng === 'qdk'
    ? `Each deployed algorithm is mapped to the hard problem behind it and to one published circuit, and the logical counts of that circuit are priced by the QDK with the settings above: qubit model <code>${escH(s.qModel)}</code>, ${QDK_QEC[qdkQecFor(s.qModel).includes(s.qec) ? s.qec : 'surface_code'].toLowerCase()}, error budget ${s.eps * 100}%${s.maxTF > 0 ? `, at most ${s.maxTF} T factories` : ''}${s.depthFactor > 1 ? `, logical depth factor ${s.depthFactor}` : ''}. AES rows use the built-in model. Rows marked as project mapping or scaling are not published counts for that exact algorithm.`
    : `Each deployed algorithm is mapped to the hard problem behind it and to one published circuit, and the logical counts of that circuit are priced by the built-in placeholder model with the hardware settings above. Rows marked as project mapping or scaling are not published counts for that exact algorithm.`;
}

/* The QDK's own report, with its labels and formatted values. */
function renderQdkReport(r) {
  const box = $('qdkReport');
  if (r.engine !== 'qdk' || !r.raw || !r.raw.reportData) { box.hidden = true; return; }
  box.hidden = false;
  const x = r.raw, get = path => path.split('/').reduce((o, k) => o == null ? o : o[k], x);
  const rows = x.reportData.groups.map(g => `<tr class="grp"><td colspan="3">${escH(g.title)}</td></tr>` + g.entries.map(e => {
    const v = get(e.path);
    return `<tr><td class="name">${escH(e.label)}</td><td class="num">${escH(v == null ? '—' : Array.isArray(v) ? v.join(', ') : v)}</td><td class="muted">${escH(e.description)}</td></tr>`;
  }).join('')).join('');
  const md = a => escH(a).replace(/^_(.*)_$/, '$1').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(.+?)\]\((https:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  $('qdkReportBody').innerHTML = `<div class="tbl-wrap"><table class="anch-tbl rep-tbl"><thead><tr><th>Quantity</th><th>Value</th><th>What it is</th></tr></thead><tbody>${rows}</tbody></table></div>`
    + `<p class="small muted anch-intro"><b>Assumptions the QDK states for every estimate</b></p><ul class="notes">${(x.reportData.assumptions || []).map(a => `<li>${md(a)}</li>`).join('')}</ul>`;
}
function renderQdkRepro(r) {
  const box = $('qdkRepro');
  if (r.engine !== 'qdk') { box.hidden = true; return; }
  box.hidden = false;
  $('qdkReproCode').textContent = `# pip install qdk
from qdk.estimator import LogicalCounts

# logical counts of one run: ${r.src}
counts = LogicalCounts(${JSON.stringify(r.counts).replace(/([:,])/g, '$1 ')})
result = counts.estimate(${JSON.stringify(r.params, null, 2)})

pc = result["physicalCounts"]
print(pc["physicalQubits"], "physical qubits")
print(pc["runtime"] / 3.6e12, "hours per run")
print("code distance", result["logicalQubit"]["codeDistance"])
print(pc["breakdown"]["numTfactories"], "T factories")`;
}
function renderQre(s) {
  const one = q => q ? `${q.qubits.toLocaleString()} qubits<span class="sm">${fmtDur(q.runtime_s)} · ${escH(q.factories)} · error ${q.error.toPrecision(2)}</span>` : '—';
  const st = QRE.settings || {};
  $('qreIntro').innerHTML = QRE.runs.length
    ? `Microsoft's current documentation [47] describes a second estimator in the QDK, the Python library <code>qdk.qre</code>. It cannot run in a web page, so these runs were computed offline with qdk ${escH(QRE.qdkVersion || '')} on ${escH(QRE.generated || '')} by <code>tools/qre_reference_runs.py</code> in the site repository, from the same per-run logical counts Q-CARE feeds the in-browser engine. Settings: ${escH(st.description || '')} Each run returns several Pareto-optimal results; the fastest and the smallest are listed, and on the frontier chart they appear as diamonds when the target and qubit model match. Rows of the current target are highlighted.`
    : 'No reference runs are embedded in this copy of the page.';
  $('qreTbl').querySelector('tbody').innerHTML = QRE.runs.map(x => {
    const fast = x.results.slice().sort((a, b) => a.runtime_s - b.runtime_s)[0], small = x.results.slice().sort((a, b) => a.qubits - b.qubits)[0];
    const sel = x.alg === s.alg && x.variant === s.variant && x.keyBits === s.keyBits;
    return `<tr class="${sel ? 'sel' : ''}"><td class="name">${escH(targetName(x.alg, x.keyBits))}<span class="sm">${escH(x.src)}</span></td><td class="num">${x.counts.numQubits.toLocaleString()} qubits<span class="sm">${fmtSci(x.counts.cczCount)} CCZ</span></td><td class="num">${escH(x.archLabel)}</td><td class="num">${one(fast)}</td><td class="num">${one(small)}</td><td class="num">${x.results.length || 'none'}${x.note ? `<span class="sm">${escH(x.note)}</span>` : ''}</td></tr>`;
  }).join('');
}

function renderEstimator() {
  const s = readSettings();
  syncDeployed();
  const eng = syncEngineUI(s), qdk = eng === 'qdk';
  const r = estimateAny(s);
  const ok = isFinite(r.phys) && isFinite(r.runtime);
  renderSettingUI(s);
  renderAnchorsTable(s.alg);
  renderComparison(s);
  renderQdkReport(r); renderQdkRepro(r); renderQre(s);
  const t = fmtT(r.runtime);
  const qd = qDay(r.phys, s.q0, YEAR0, s.doubling);
  window.__qday = qd;
  const alg = targetName(s.alg, s.keyBits);
  const setting = SETTINGS[s.alg].find(x => x.id === SETTING);
  const scaled = r.scaled ? ' <span class="pill warn">scaled</span>' : '';
  const retry = qdk ? 1 / (1 - s.eps) : 1 / (1 - r.fail);
  const finish = () => {
    chartTO(s, r); chartP(s, r); chartQ(s, r);
    $('d').disabled = $('dAuto').checked; if (!qdk && $('dAuto').checked && isFinite(r.d)) $('d').value = r.d;
    $('arithOptV').textContent = s.arithOpt + '×'; $('pPhysV').textContent = s.pPhys.toExponential(1); $('routingV').textContent = s.routing.toFixed(2) + '×';
  };
  const opMode = SETTING !== 'I' && ok;
  $('tExpTile').hidden = opMode; $('tGTile').hidden = opMode;
  if (opMode) {
    const o = opView(s, r);
    const perOp = r.runtime * (o.T / r.T);
    const ot = fmtT(perOp);
    const published = o.rule !== 'placeholder ratio';
    $('tPhysL').textContent = 'Physical qubits (footprint)'; $('tPhys').textContent = fmtN(r.perMachine);
    $('tPhysSub').textContent = `same machine, d = ${r.d}`;
    $('tTimeL').textContent = 'Time per operation'; $('tTime').innerHTML = `${ot.v} <small>${ot.u}</small>`;
    $('tTimeSub').textContent = `${fmtSci(o.T)} ${o.unit}`;
    $('tLL').textContent = 'Logical qubits'; $('tL').textContent = o.L.toLocaleString(); $('tLSub').textContent = 'working registers';
    $('tDL').textContent = 'Repetitions in attack'; $('tD').textContent = fmtN(o.count); $('tDSub').textContent = o.opsLabel;
    $('verdict').innerHTML = `<span class="pill ${published ? 'good' : 'warn'}">Setting ${SETTING} · ${published ? 'published rule' : 'placeholder'}</span><p><b>${setting.name}.</b> ${setting.task}. One such operation is estimated at <b>${fmtSci(o.T)} ${o.unit}</b> and about <b>${ot.v} ${ot.u}</b> under the current hardware assumptions${qdk ? ' (QDK engine)' : ''}; the complete attack on ${alg} (setting I, ${r.src}) performs it ${published ? '' : 'roughly '}${fmtN(o.count)} times per run. Derivation: ${o.rule}. Charts below always describe the complete attack.</p>`;
    finish();
    return;
  }
  const grover = r.kind === 'grover';
  $('tPhysL').textContent = 'Physical qubits'; $('tTimeL').textContent = grover ? 'Runtime' : 'Runtime per run'; $('tLL').textContent = 'Logical qubits'; $('tDL').textContent = 'Code distance';
  $('tPhys').textContent = ok ? fmtN(r.phys) : '—';
  $('tTime').innerHTML = ok ? `${t.v} <small>${t.u}</small>` : '—';
  $('tL').textContent = r.L.toLocaleString();
  $('tD').textContent = isFinite(r.d) ? r.d : '—';
  $('tG').textContent = fmtSci(r.T);
  const ex = fmtT(r.expected);
  $('tExp').innerHTML = ok && isFinite(r.expected) ? `${ex.v} <small>${ex.u}</small>` : '—';
  $('tExpL').textContent = grover ? 'Expected total' : qdk ? 'Expected total (upper bound)' : 'Expected total';
  $('tGL').textContent = grover ? 'T-depth of the search' : 'Gate count per run';
  if (qdk) {
    $('tPhysSub').textContent = ok ? `${fmtN(r.physAlg)} algorithm + ${fmtN(r.physFac)} in ${r.factories} T ${plural(r.factories, 'factory', 'factories')}` : 'no estimate';
    $('tTimeSub').textContent = ok ? `${fmtSci(r.depth)} logical cycles of ${fmtCycle(r.cycleNs)}` : '';
    $('tExpSub').textContent = ok ? `${r.runs} expected ${plural(r.runs, 'run', 'runs')} · retries ≤ ${retry.toFixed(2)}×` : '';
    $('tLSub').textContent = (r.Lnote || 'as published') + (ok ? ` · ${r.Llayout.toLocaleString()} after QDK layout` : '');
    $('tGSub').textContent = r.unit + (ok ? ` · ${fmtSci(r.tstates)} T states in the QDK` : '');
    $('tDSub').textContent = ok ? `p_L = ${r.pLogical.toExponential(1)} per qubit and cycle` : 'no distance found';
  } else {
    $('tPhysSub').textContent = grover && r.P > 1 ? `${fmtN(r.perMachine)} × ${r.P} machines` : `${r.d === Infinity ? 'above threshold' : 'd = ' + r.d + ', ' + s.factories + ' factories'}`;
    $('tTimeSub').textContent = grover ? `${fmtSci(r.iters)} Grover iterations` : `${fmtSci(r.T)} ${r.unit} per run · ${r.runs} expected runs`;
    $('tExpSub').textContent = grover ? 'one search' + (isFinite(retry) ? ` · retries ${retry.toFixed(2)}×` : '') : `${r.runs} expected ${plural(r.runs, 'run', 'runs')} · retries ${isFinite(retry) ? retry.toFixed(2) : '∞'}×`;
    $('tLSub').textContent = grover ? 'per machine' : (r.Lnote || (r.scaled ? 'scaled from the published size' : 'as published'));
    $('tGSub').textContent = grover ? 'iterations × T-depth per iteration' : r.unit;
    $('tDSub').textContent = isFinite(r.d) ? `p_L = ${r.pLogical.toExponential(1)} / cycle` : 'no distance suffices';
  }
  let v;
  if (!ok && qdk) v = `<span class="pill bad">No estimate</span><p>The QDK returned no estimate for ${alg} with these settings: ${escH(r.err || 'unknown reason')}. Change the qubit model, the error budget or the constraints, or switch to the built-in model.</p>`;
  else if (r.d === Infinity) v = `<span class="pill bad">Not feasible</span><p>At a physical error rate at or above the 1% threshold no code distance suppresses errors. Lower the error rate.</p>`;
  else if (grover) v = `<span class="pill good">Symmetric keys hold</span>${ENGINE_WANT === 'qdk' ? ' <span class="pill warn">built-in model</span>' : ''}<p>Breaking ${alg} by Grover search takes ${t.v} ${t.u} on ${r.P > 1 ? r.P + ' machines' : 'one machine'} of ${fmtN(r.perMachine)} physical qubits. Parallelism only buys a square root, so key search stays out of reach; doubling the key length (AES-256) restores the full margin.</p>`;
  else {
    const cls = qd <= 2032 ? 'bad' : qd <= 2040 ? 'warn' : 'good';
    const wl = s.window ? $('window').selectedOptions[0].textContent.toLowerCase() : '';
    const tail = `If the largest machine grows from ${fmtN(s.q0)} qubits doubling every ${s.doubling} years, that size arrives around <b>${isFinite(qd) ? qd.toFixed(0) : '—'}</b>.`;
    if (qdk) {
      let win = '';
      if (s.window) { const w = estimateQdk(s, {maxDurationS: s.window}); win = isFinite(w.phys) ? ` To finish one run inside ${wl} the QDK needs about ${fmtN(w.phys)} physical qubits with ${w.factories} T ${plural(w.factories, 'factory', 'factories')}.` : ` The QDK finds no configuration that finishes one run inside ${wl}.`; }
      const m = QDK_MODELS[s.qModel] || QDK_MODELS.qubit_gate_ns_e3;
      v = `<span class="pill ${cls}">Q-day ≈ ${isFinite(qd) ? qd.toFixed(0) : 'beyond horizon'}</span> <span class="pill good">QDK estimate</span>${scaled}<p>Breaking ${alg} with the ${r.src} circuit needs about <b>${fmtN(r.phys)} physical qubits</b> for <b>${t.v} ${t.u}</b> per run on the QDK's architecture: ${m.custom ? `a custom gate-based qubit (${s.qGate} ns gates, ${s.qMeas} ns measurement, error ${s.pPhys.toExponential(1)})` : `qubit model <code>${escH(s.qModel)}</code>`}, ${QDK_QEC[r.params.qecScheme.name].toLowerCase()} at distance ${r.d}, ${r.Llayout.toLocaleString()} logical qubits after layout and ${r.factories} T ${plural(r.factories, 'factory', 'factories')} taking ${(100 * r.physFac / r.phys).toFixed(0)}% of the machine. The source charges ${r.runs} expected ${plural(r.runs, 'run', 'runs')} and the ${s.eps * 100}% error budget allows up to ${retry.toFixed(2)}× for retries, so the expected total is at most <b>${ex.v} ${ex.u}</b>. ${tail}${win}</p>`;
    } else {
      const win = s.window ? (r.windowFeasible ? ` To finish one run inside ${wl} the attacker needs ${r.windowFactories} factories and about ${fmtN(r.windowPhys)} physical qubits.` : ` The reaction-time floor alone exceeds the ${wl} budget: one run cannot finish in that window at any factory count.`) : '';
      v = `<span class="pill ${cls}">Q-day ≈ ${isFinite(qd) ? qd.toFixed(0) : 'beyond horizon'}</span>${scaled}<p>Breaking ${alg} with the ${r.src} circuit needs about <b>${fmtN(r.phys)} physical qubits</b> for <b>${t.v} ${t.u}</b> per run. The source charges ${r.runs} expected run${r.runs === 1 ? '' : 's'} and this configuration adds ${retry.toFixed(2)}× for logical-error retries, so the expected total is <b>${ex.v} ${ex.u}</b>. ${tail}${win}</p>`;
    }
  }
  $('verdict').innerHTML = v;
  finish();
}

/* Load the QDK module (a plain script plus its .wasm file, both served next to the page). Any failure leaves the built-in model in charge. */
function loadQdk() {
  const done = () => { if (document.body.dataset.ready) renderAll(); };
  const fail = why => { if (QDK.state !== 'loading') return; QDK.state = 'failed'; QDK.error = why; done(); };
  try {
    if (typeof WebAssembly !== 'object') return fail('this browser has no WebAssembly');
    const sc = document.createElement('script');
    sc.src = 'vendor/qdk/qcare_qdk_estimator.js';
    sc.onerror = () => fail('its files are not reachable from this copy of the page');
    sc.onload = () => {
      try {
        wasm_bindgen({module_or_path: 'vendor/qdk/qcare_qdk_estimator_bg.wasm'}).then(() => {
          if (QDK.state !== 'loading') return;
          QDK.api = wasm_bindgen;
          const probe = JSON.parse(wasm_bindgen.physical_estimates('{"numQubits":100,"cczCount":1000000}', '[{"errorBudget":0.1}]'))[0];
          if (!probe || !probe.physicalCounts) throw new Error('self-test failed');
          QDK.commit = wasm_bindgen.qdk_commit(); QDK.state = 'ready'; done();
        }).catch(e => fail('its WebAssembly file could not be loaded or started: ' + String(e && e.message || e).slice(0, 120)));
      } catch (e) { fail(String(e && e.message || e).slice(0, 120)); }
    };
    document.head.appendChild(sc);
    setTimeout(() => fail('loading timed out'), 20000);
  } catch (e) { fail(String(e && e.message || e).slice(0, 120)); }
}
function initEstimator() {
  fillSelect($('alg'), Object.entries(ALGS).map(([k, a]) => [k, a.name]));
  fillSelect($('qModel'), Object.entries(QDK_MODELS).map(([k, m]) => [k, m.label]));
  syncQec();
  $('deployed').innerHTML = '<option value="">Custom selection</option>' + DEPLOYED.map(g => `<optgroup label="${g.grp}">${g.items.map(d => `<option value="${d.id}">${d.label}</option>`).join('')}</optgroup>`).join('');
  $('presets').innerHTML = PRESETS.map((p, i) => `<button type="button" data-preset="${i}">${p.label}</button>`).join('');
  $('presets').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) applyPreset(PRESETS[+b.dataset.preset].s); });
  renderAnchorsTable('rsa');
  $('deployed').addEventListener('change', e => { if (e.target.value) applyDeployed(e.target.value); });
  $('cmpTbl').addEventListener('click', e => { const b = e.target.closest('[data-deploy]'); if (b) { applyDeployed(b.dataset.deploy); $('estimator').querySelector('.ctrl-grid').scrollIntoView({block: 'start'}); } });
  $('alg').addEventListener('change', () => { syncAlgUI(); renderAll(); });
  $('variant').addEventListener('change', () => { syncKeys(); renderAll(); });
  $('qModel').addEventListener('change', () => { syncQec(); renderAll(); });
  $('seg').addEventListener('click', e => { const b = e.target.closest('[data-setting-id]'); if (b) { SETTING = b.dataset.settingId; renderAll(); } });
  $('engSeg').addEventListener('click', e => { const b = e.target.closest('[data-engine-id]'); if (b) { ENGINE_WANT = b.dataset.engineId; renderAll(); } });
  $('qdkReproCopy').addEventListener('click', () => {
    const pre = $('qdkReproCode'), btn = $('qdkReproCopy');
    const selectIt = () => { const rg = document.createRange(); rg.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); btn.textContent = 'Selected: press Ctrl/Cmd + C'; };
    try { navigator.clipboard.writeText(pre.textContent).then(() => { btn.textContent = 'Copied'; }, selectIt); } catch (e) { selectIt(); }
    setTimeout(() => { btn.textContent = 'Copy the snippet'; }, 2500);
  });
  initTradeoffHover();
  document.querySelector('#estimator').addEventListener('input', e => { if (!['alg', 'variant', 'qModel', 'deployed'].includes(e.target.id)) renderAll(); });
  applyPreset(PRESETS[0].s);
  DEPLOY_ID = '';
  loadQdk();
}
