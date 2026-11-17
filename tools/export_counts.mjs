// Writes data/qcare-logical-counts.json: the per-run logical counts Q-CARE feeds the QDK estimator,
// taken from the page's own model (src/frag_model.js, src/frag_est.js) so that offline runs use the same inputs.
//   node tools/export_counts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const src = readFileSync(root + 'src/frag_model.js', 'utf8') + '\n' + readFileSync(root + 'src/frag_est.js', 'utf8');
const { ALGS, DEPLOYED_FLAT, logicalCost, qdkCounts, keysFor } = new Function(src + '\nreturn {ALGS, DEPLOYED_FLAT, logicalCost, qdkCounts, keysFor};')();
const HEADLINE = { rsa: 2048, ecc: 256, ffdlp: 2048 };
const seen = new Set(), targets = [];
const add = (alg, variant, keyBits) => {
  const id = `${alg}:${variant}:${keyBits}`;
  if (seen.has(id) || alg === 'aes' || !keysFor(alg, variant).includes(keyBits)) return;
  seen.add(id);
  const c = logicalCost({ alg, variant, keyBits, arithOpt: 1 });
  targets.push({ id, alg, variant, keyBits, src: c.src, unit: c.unit, runs: c.runs, scaled: c.scaled, counts: qdkCounts(c) });
};
for (const [alg, a] of Object.entries(ALGS)) for (const v of a.variants) add(alg, v.id, HEADLINE[alg]);
for (const d of DEPLOYED_FLAT) add(d.alg, d.variant, d.keyBits);
writeFileSync(root + 'data/qcare-logical-counts.json', JSON.stringify({ note: 'Per-run logical counts Q-CARE feeds the QDK estimator; one Toffoli of the source count is one CCZ.', targets }, null, 1) + '\n');
console.log(targets.length, 'targets');
for (const t of targets) console.log(t.id.padEnd(26), String(t.counts.numQubits).padStart(6), t.counts.cczCount.toExponential(3), 'runs', t.runs);
