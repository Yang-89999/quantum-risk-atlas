/* ---------- 4. PQC Benchmark Suite ----------
   Framework and data browser only: three views (schemes, attacks, benchmarks) over one data module
   (the JSON in #pqc-data, mirrored at data/pqc-benchmark.json). No cryptanalysis, no estimation:
   every value shown is read from the data; missing values render as pending. */
const BS = JSON.parse(document.getElementById('pqc-data').textContent);
const fmtB = b => b == null ? 'n/a' : b.toLocaleString() + ' B';
const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));
const IDX = {
  scheme: byId(BS.schemes), attack: byId(BS.attacks), case: byId(BS.benchmarkCases), est: byId(BS.resourceEstimates), ref: byId(BS.references),
  pset: Object.fromEntries(BS.schemes.flatMap(s => s.parameterSets.map(p => [p.id, {...p, schemeId: s.id}]))),
};
const attacksFor = schemeId => BS.attacks.filter(a => a.applicability.some(ap => ap.schemeId === schemeId));
const casesForScheme = id => BS.benchmarkCases.filter(c => c.schemeId === id);
const casesForAttack = id => BS.benchmarkCases.filter(c => c.attackId === id);
const estsForCase = c => c.resourceEstimateIds.map(id => IDX.est[id]).filter(Boolean);
const hasValue = e => Object.values(e.metrics).some(v => v != null);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
const shortFoundation = f => { const t = f.split(/[;:(]| over /)[0].trim(); return t.length > 44 ? t.slice(0, 42).replace(/\s+\S*$/, '') + '…' : t; };
const slug = v => String(v).toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
const tag = (v, cls) => `<span class="tag ${cls || slug(v)}">${esc(v)}</span>`;
const lnk = (kind, id, text) => `<button type="button" class="link" data-open="${kind}:${esc(id)}">${esc(text)}</button>`;
const pend = (t = 'pending') => `<span class="pend">${esc(t)}</span>`;
const METRICS = [
  {g: 'Classical resources', k: 'classicalCostLog2', n: 'Classical cost (log₂ operations)'},
  {g: 'Classical resources', k: 'classicalMemoryLog2', n: 'Classical memory (log₂)'},
  {g: 'Logical quantum resources', k: 'logicalQubits', n: 'Logical qubits'},
  {g: 'Logical quantum resources', k: 'gateCountLog2', n: 'Quantum gate count (log₂)'},
  {g: 'Logical quantum resources', k: 'depthLog2', n: 'Circuit depth (log₂)'},
  {g: 'Logical quantum resources', k: 'runtime', n: 'Estimated runtime'},
  {g: 'Physical hardware resources', k: 'physicalQubits', n: 'Physical qubits'},
  {g: 'Physical hardware resources', k: 'hardwareAssumptions', n: 'Hardware and error-correction assumptions'},
  {g: 'Attack outcome', k: 'successProbability', n: 'Attack success probability'},
];
const metricValue = (e, k) => k === 'hardwareAssumptions' ? e.hardwareAssumptions : e.metrics[k];
const fmtMetric = (k, v) => v == null ? null : k.endsWith('Log2') ? '2^' + v : typeof v === 'number' ? v.toLocaleString() : String(v);
const refList = ids => ids && ids.length ? `<ul>${ids.map(id => `<li>${esc((IDX.ref[id] || {citation: id}).citation)}</li>`).join('')}</ul>` : `<p class="muted">${pend('no reference recorded')}</p>`;
const psetLabel = id => (IDX.pset[id] || {name: id}).name;
const applicabilityText = ap => ap.parameterSetIds === 'all' ? 'all parameter sets' : ap.parameterSetIds.map(psetLabel).join(', ');

const bsState = {view: 'schemes', s: {q: '', family: '', status: '', objective: ''}, a: {q: '', model: '', technique: '', scheme: '', validation: ''}, b: {q: '', scheme: '', model: '', method: '', evidence: '', validation: ''}, compare: new Set(), stack: []};
const opt = (arr, all) => [`<option value="">${all}</option>`].concat(arr.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`)).join('');
const uniq = arr => [...new Set(arr)];

function initPqc() {
  $('schemaV').textContent = BS.schemaVersion; $('schemaU').textContent = BS.updated;
  $('sFamily').innerHTML = opt(Object.entries(BS.families).map(([k, f]) => [k, f.name]), 'All families');
  $('sStatus').innerHTML = opt(Object.entries(BS.statusLabels), 'All statuses');
  $('aTechnique').innerHTML = opt(uniq(BS.attacks.map(a => a.technique)).map(t => [t, t]), 'All techniques');
  $('aScheme').innerHTML = opt(BS.schemes.map(s => [s.id, s.name]), 'All schemes');
  $('aEvidence').innerHTML = opt(uniq(BS.attacks.map(a => a.validationStatus)).map(t => [t, t]), 'All validation states');
  $('bScheme').innerHTML = opt(BS.schemes.map(s => [s.id, s.name]), 'All schemes');
  $('bMethod').innerHTML = opt(uniq(BS.benchmarkCases.map(c => c.estimationMethod.split(',')[0].trim())).map(t => [t, t]), 'All methods');
  $('bEvidence').innerHTML = opt(uniq(BS.benchmarkCases.map(c => c.evidenceStatus)).map(t => [t, t]), 'All evidence states');
  $('bValidation').innerHTML = opt(uniq(BS.benchmarkCases.map(c => c.validationStatus)).map(t => [t, t]), 'All validation states');
  const bind = (id, group, key, ev = 'input') => $(id).addEventListener(ev, e => { bsState[group][key] = e.target.value; renderPqc(); });
  bind('sSearch', 's', 'q'); bind('sFamily', 's', 'family', 'change'); bind('sStatus', 's', 'status', 'change'); bind('sObjective', 's', 'objective', 'change');
  bind('aSearch', 'a', 'q'); bind('aModel', 'a', 'model', 'change'); bind('aTechnique', 'a', 'technique', 'change'); bind('aScheme', 'a', 'scheme', 'change'); bind('aEvidence', 'a', 'validation', 'change');
  bind('bSearch', 'b', 'q'); bind('bScheme', 'b', 'scheme', 'change'); bind('bModel', 'b', 'model', 'change'); bind('bMethod', 'b', 'method', 'change'); bind('bEvidence', 'b', 'evidence', 'change'); bind('bValidation', 'b', 'validation', 'change');
  const reset = (group, ids) => { Object.keys(bsState[group]).forEach(k => bsState[group][k] = ''); ids.forEach(id => $(id).value = ''); renderPqc(); };
  $('sReset').addEventListener('click', () => reset('s', ['sSearch', 'sFamily', 'sStatus', 'sObjective']));
  $('aReset').addEventListener('click', () => reset('a', ['aSearch', 'aModel', 'aTechnique', 'aScheme', 'aEvidence']));
  $('bReset').addEventListener('click', () => reset('b', ['bSearch', 'bScheme', 'bModel', 'bMethod', 'bEvidence', 'bValidation']));
  document.querySelector('#pqc .views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  document.querySelector('#pqc').addEventListener('click', e => {
    const chk = e.target.closest('input[data-case]');
    if (chk) { if (chk.checked) bsState.compare.add(chk.dataset.case); else bsState.compare.delete(chk.dataset.case); renderTray(); return; }
    const rm = e.target.closest('[data-unselect]');
    if (rm) { bsState.compare.delete(rm.dataset.unselect); renderBenchmarks(); renderTray(); return; }
    const o = e.target.closest('[data-open]');
    if (o) { const [kind, id] = o.dataset.open.split(':'); openDetail(kind, id); }
  });
  $('cmpBtn').addEventListener('click', renderCompare);
  $('cmpClear').addEventListener('click', () => { bsState.compare.clear(); $('compare').hidden = true; renderBenchmarks(); renderTray(); });
  $('dClose').addEventListener('click', closeDrawer); $('scrim').addEventListener('click', closeDrawer);
  $('dBack').addEventListener('click', () => { bsState.stack.pop(); const top = bsState.stack[bsState.stack.length - 1]; if (top) openDetail(top.kind, top.id, false); else closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });
  try { const v = localStorage.getItem('qra-bs-view'); if (['schemes', 'attacks', 'benchmarks'].includes(v)) bsState.view = v; } catch (e) {}
  setView(bsState.view);
  renderInterp();
}
function setView(v) {
  bsState.view = v;
  try { localStorage.setItem('qra-bs-view', v); } catch (e) {}
  document.querySelectorAll('#pqc .views [data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  ['schemes', 'attacks', 'benchmarks'].forEach(k => $('view-' + k).hidden = k !== v);
  renderPqc();
}
function renderPqc() {
  const withValue = BS.resourceEstimates.filter(hasValue).length;
  $('bsStats').innerHTML = [
    [BS.schemes.length, 'Schemes', `${BS.schemes.filter(s => s.status === 'standardized').length} standardized, ${BS.schemes.filter(s => s.status !== 'standardized').length} draft, selected or candidate.`, true],
    [BS.attacks.length, 'Attacks catalogued', `${BS.attacks.filter(a => a.model === 'classical').length} classical · ${BS.attacks.filter(a => a.model === 'quantum').length} quantum · ${BS.attacks.filter(a => a.model === 'hybrid').length} hybrid.`],
    [BS.benchmarkCases.length, 'Benchmark cases', `${BS.benchmarkCases.filter(c => c.evidenceStatus === 'literature').length} with literature values, ${BS.benchmarkCases.filter(c => c.illustrative).length} illustrative.`],
    [`${withValue}<small>/${BS.resourceEstimates.length}</small>`, 'Estimate runs with a value', `${BS.resourceEstimates.filter(e => e.status === 'reproduced').length} reproduced by this project.`],
  ].map(([n, l, note, acc]) => `<div class="stat"><div class="big ${acc ? 'accent' : ''}">${n}</div><div class="lbl">${l}</div><div class="note">${note}</div></div>`).join('');
  $('cntSchemes').textContent = BS.schemes.length; $('cntAttacks').textContent = BS.attacks.length; $('cntCases').textContent = BS.benchmarkCases.length;
  renderSchemes(); renderAttacks(); renderBenchmarks(); renderTray();
}
const matches = (q, ...fields) => !q || fields.join(' ').toLowerCase().includes(q.toLowerCase());
function renderSchemes() {
  const f = bsState.s;
  const rows = BS.schemes.filter(s => matches(f.q, s.name, s.foundation, s.standard, BS.families[s.familyId].name) && (!f.family || s.familyId === f.family) && (!f.status || s.status === f.status) && (!f.objective || s.objective === f.objective));
  $('sTable').querySelector('tbody').innerHTML = rows.map(s => `<tr data-open="scheme:${s.id}"><td><span class="name">${esc(s.name)}</span><span class="sm">${esc(s.standard)}</span></td><td>${esc(BS.families[s.familyId].name)}<span class="sm">${esc(shortFoundation(s.foundation))}</span></td><td>${tag(BS.statusLabels[s.status], s.status)}</td><td>${esc(s.objective)}</td><td>${s.parameterSets.map(p => `<span class="sm">${esc(p.name)} · cat ${p.category}</span>`).join('')}</td><td class="num">${attacksFor(s.id).length}</td><td class="num">${casesForScheme(s.id).length}</td><td>${tag(s.evidenceStatus)}</td><td><button type="button" class="btn" data-open="scheme:${s.id}">View security profile</button></td></tr>`).join('');
  $('sEmpty').hidden = rows.length > 0;
}
function renderAttacks() {
  const f = bsState.a;
  const rows = BS.attacks.filter(a => matches(f.q, a.id, a.name, a.technique, a.description) && (!f.model || a.model === f.model) && (!f.technique || a.technique === f.technique) && (!f.scheme || a.applicability.some(ap => ap.schemeId === f.scheme)) && (!f.validation || a.validationStatus === f.validation));
  $('aTable').querySelector('tbody').innerHTML = rows.map(a => `<tr data-open="attack:${a.id}"><td class="id">${esc(a.id)}</td><td><span class="name">${esc(a.name)}</span></td><td>${tag(a.model)}</td><td>${esc(a.technique)}</td><td>${esc(a.targetGoal)}</td><td>${a.applicability.map(ap => `<span class="sm">${esc(IDX.scheme[ap.schemeId].name)} · ${esc(applicabilityText(ap))}</span>`).join('')}</td><td class="num">${casesForAttack(a.id).length}</td><td>${tag(a.estimationStatus)}</td><td>${tag(a.validationStatus)}</td></tr>`).join('');
  $('aEmpty').hidden = rows.length > 0;
}
function renderBenchmarks() {
  const f = bsState.b;
  const rows = BS.benchmarkCases.filter(c => matches(f.q, c.id, IDX.scheme[c.schemeId].name, psetLabel(c.parameterSetId), IDX.attack[c.attackId].name, c.estimationMethod, c.notes) && (!f.scheme || c.schemeId === f.scheme) && (!f.model || c.model === f.model) && (!f.method || c.estimationMethod.startsWith(f.method)) && (!f.evidence || c.evidenceStatus === f.evidence) && (!f.validation || c.validationStatus === f.validation));
  $('bTable').querySelector('tbody').innerHTML = rows.map(c => `<tr data-open="case:${c.id}"><td><input type="checkbox" data-case="${c.id}" aria-label="Select ${c.id} for comparison" ${bsState.compare.has(c.id) ? 'checked' : ''}></td><td class="id">${esc(c.id)}${c.illustrative ? '<br>' + tag('illustrative') : ''}</td><td>${esc(IDX.scheme[c.schemeId].name)}</td><td>${esc(psetLabel(c.parameterSetId))}</td><td>${esc(IDX.attack[c.attackId].name)}</td><td>${tag(c.model)}</td><td>${esc(c.estimationMethod)}</td><td>${tag(c.evidenceStatus)}</td><td>${tag(c.validationStatus)}</td></tr>`).join('');
  $('bEmpty').hidden = rows.length > 0;
}
function renderTray() {
  const ids = [...bsState.compare];
  $('tray').hidden = ids.length === 0;
  if (ids.length === 0) $('compare').hidden = true;
  $('trayChips').innerHTML = ids.map(id => `<span class="chip">${esc(id)}<button type="button" data-unselect="${id}" aria-label="Remove ${id}">✕</button></span>`).join('');
  $('cmpBtn').disabled = ids.length < 2; $('cmpBtn').textContent = ids.length < 2 ? 'Select two or more cases' : `Compare ${ids.length} cases`;
}
function comparability(cases) {
  const diff = [];
  const d = (k, label) => { if (uniq(cases.map(k)).length > 1) diff.push(label); };
  d(c => c.targetGoal, 'target security goal'); d(c => c.model, 'attack model (classical / quantum / hybrid)');
  d(c => c.estimationMethod.split(',')[0].trim(), 'resource-estimation method'); d(c => IDX.scheme[c.schemeId].familyId, 'mathematical family');
  return diff;
}
function renderCompare() {
  const cases = [...bsState.compare].map(id => IDX.case[id]).filter(Boolean);
  if (cases.length < 2) return;
  const cols = cases.flatMap(c => { const es = estsForCase(c); return es.length ? es.map(e => ({c, e})) : [{c, e: null}]; });
  const diff = comparability(cases);
  let html = `<div class="compat ${diff.length ? '' : 'ok'}"><b>Comparability.</b> ${diff.length ? `These records differ in ${diff.join(', ')}. Their numbers answer different questions and are shown side by side for inspection only, not as equivalents.` : 'Same target goal, attack model, estimation method and family: the recorded values can be compared on like terms, subject to each run’s own assumptions.'}</div>`;
  html += `<div class="tbl-wrap"><table><thead><tr><th>Metric</th>${cols.map(({c, e}) => `<th>${esc(c.id)}<span class="sm">${esc(IDX.scheme[c.schemeId].name)} · ${esc(psetLabel(c.parameterSetId))}</span><span class="sm">${esc(IDX.attack[c.attackId].name)}</span><span class="sm">${e ? esc(e.id + ' · ' + e.source + ' · ' + e.status) : 'no estimate run'}</span></th>`).join('')}</tr></thead><tbody>`;
  let g = '';
  METRICS.forEach(m => {
    if (m.g !== g) { g = m.g; html += `<tr><td class="grp" colspan="${cols.length + 1}">${esc(g)}</td></tr>`; }
    html += `<tr><td>${esc(m.n)}</td>${cols.map(({e}) => { const v = e ? fmtMetric(m.k, metricValue(e, m.k)) : null; return v == null ? `<td class="na">pending</td>` : `<td class="v">${esc(v)}</td>`; }).join('')}</tr>`;
  });
  html += `<tr><td>Assumptions</td>${cols.map(({c}) => `<td class="sm">${esc(Object.entries(c.assumptions).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—')}</td>`).join('')}</tr>`;
  html += `<tr><td>Limitations</td>${cols.map(({e}) => `<td class="sm">${esc(e ? e.limitations : 'No run recorded for this case.')}</td>`).join('')}</tr></tbody></table></div>`;
  // chart: only metrics with two or more recorded numeric values
  const chartable = METRICS.filter(m => m.k.endsWith('Log2') && cols.filter(({e}) => e && typeof e.metrics[m.k] === 'number').length >= 2);
  if (chartable.length) {
    html += chartable.map(m => { const vals = cols.filter(({e}) => e && typeof e.metrics[m.k] === 'number'); const max = Math.max(...vals.map(({e}) => e.metrics[m.k]));
      return `<figure style="margin-top:16px"><figcaption><b>${esc(m.n)}</b>, as recorded. Bars show the exponent; a difference of 1 is a factor of two.</figcaption><div class="bars">${vals.map(({c, e}) => `<div class="bar"><span>${esc(c.id)}</span><div class="track"><div class="fill" style="width:${(e.metrics[m.k] / max * 100).toFixed(1)}%"></div></div><span class="v">2^${e.metrics[m.k]}</span></div>`).join('')}</div></figure>`; }).join('');
  } else html += `<p class="empty">No chart: fewer than two of the selected runs carry a recorded numeric value for the same metric. The chart appears once estimates are recorded.</p>`;
  $('compare').innerHTML = html; $('compare').hidden = false;
  $('compare').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function renderInterp() {
  const rows = [];
  BS.schemes.forEach(s => s.parameterSets.forEach(p => {
    const cases = BS.benchmarkCases.filter(c => c.parameterSetId === p.id);
    const ests = cases.flatMap(estsForCase);
    const valued = ests.filter(hasValue);
    const methods = uniq(valued.map(e => IDX.case[e.benchmarkCaseId].estimationMethod));
    rows.push(`<tr><td><span class="name">${lnk('scheme', s.id, s.name)}</span></td><td>${esc(p.name)}</td><td class="num">${p.category}</td><td>${valued.length ? `${valued.length} literature-reported${ests.length > valued.length ? `, ${ests.length - valued.length} pending` : ''}` : (ests.length ? `${ests.length} pending` : pend('none recorded'))}</td><td class="sm">${esc(methods.join('; ') || '—')}</td><td>${tag(s.evidenceStatus)}</td><td>${pend(valued.length ? 'literature-reported; not interpreted' : 'pending methodology')}</td></tr>`);
  }));
  $('interpTable').querySelector('tbody').innerHTML = rows.join('');
}
/* drawer */
function openDetail(kind, id, push = true) {
  const html = kind === 'scheme' ? detailScheme(IDX.scheme[id]) : kind === 'attack' ? detailAttack(IDX.attack[id]) : detailCase(IDX.case[id]);
  if (!html) return;
  if (push) { const top = bsState.stack[bsState.stack.length - 1]; if (!top || top.kind !== kind || top.id !== id) bsState.stack.push({kind, id}); }
  $('dBody').innerHTML = html; $('dBody').scrollTop = 0;
  $('crumbs').textContent = bsState.stack.map(x => `${x.kind} ${x.id}`).join('  ›  ');
  $('dBack').hidden = bsState.stack.length < 2;
  $('drawer').hidden = false; $('scrim').hidden = false;
  $('dClose').focus();
}
function closeDrawer() { $('drawer').hidden = true; $('scrim').hidden = true; bsState.stack = []; }
const caseRows = cases => cases.length ? `<div class="tbl-wrap"><table><thead><tr><th>Case</th><th>Parameter set</th><th>Attack</th><th>Model</th><th>Evidence</th><th>Validation</th></tr></thead><tbody>${cases.map(c => `<tr><td>${lnk('case', c.id, c.id)}${c.illustrative ? ' ' + tag('illustrative') : ''}</td><td>${esc(psetLabel(c.parameterSetId))}</td><td>${lnk('attack', c.attackId, IDX.attack[c.attackId].name)}</td><td>${tag(c.model)}</td><td>${tag(c.evidenceStatus)}</td><td>${tag(c.validationStatus)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="empty">No benchmark case recorded yet.</p>`;
function detailScheme(s) {
  if (!s) return '';
  const fam = BS.families[s.familyId], atks = attacksFor(s.id), cases = casesForScheme(s.id), ests = cases.flatMap(estsForCase), valued = ests.filter(hasValue);
  return `${tag(BS.statusLabels[s.status], s.status)} ${tag(fam.name, 'fam')} ${tag(s.objective, 'obj')}
  <h3>${esc(s.name)}</h3><p class="lead">${esc(s.standard)}</p>
  <h4>Overview and parameter sets</h4>
  <div class="tbl-wrap"><table><thead><tr><th>Set</th><th class="num">Category</th><th class="num">Public key</th><th class="num">${esc(s.parameterSets[0].sizes.outputKind)}</th><th>Parameters</th></tr></thead><tbody>${s.parameterSets.map(p => `<tr><td>${esc(p.name)}</td><td class="num">${p.category}</td><td class="num">${fmtB(p.sizes.publicKey)}</td><td class="num">${fmtB(p.sizes.output)}</td><td class="sm">${esc(Object.entries(p.params).map(([k, v]) => `${k} = ${v}`).join(', '))}</td></tr>`).join('')}</tbody></table></div>
  <h4>Mathematical problem and security assumptions</h4><p>${esc(s.foundation)}.</p><ul>${s.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
  <h4>Applicable known attacks (${atks.length})</h4>${atks.length ? `<ul>${atks.map(a => { const ap = a.applicability.find(x => x.schemeId === s.id); return `<li>${lnk('attack', a.id, a.name)} ${tag(a.model)} <span class="sm">${esc(applicabilityText(ap))} · ${esc(ap.conditions)}</span></li>`; }).join('')}</ul>` : `<p class="empty">No attack has been linked to this scheme yet.</p>`}
  <h4>Associated benchmark cases (${cases.length})</h4>${caseRows(cases)}
  <h4>Available resource estimates</h4>${ests.length ? `<ul>${ests.map(e => `<li>${lnk('case', e.benchmarkCaseId, e.id + ' · ' + e.benchmarkCaseId)} · ${esc(e.source)} · ${tag(e.status)} ${hasValue(e) ? `<span class="sm">${METRICS.filter(m => metricValue(e, m.k) != null).map(m => `${m.n}: ${fmtMetric(m.k, metricValue(e, m.k))}`).join(' · ')}</span>` : `<span class="sm">no values recorded</span>`}</li>`).join('')}</ul>` : `<p class="empty">No resource estimate recorded for this scheme.</p>`}
  <h4>References and evidence status</h4><p>Evidence: ${tag(s.evidenceStatus)}</p>${refList(s.referenceIds)}
  <h4>Security interpretation and known limitations</h4>
  <div class="tbl-wrap"><table><thead><tr><th>Set</th><th>Claimed category</th><th>Recorded estimates</th><th>Interpretation</th></tr></thead><tbody>${s.parameterSets.map(p => { const v = valued.filter(e => IDX.case[e.benchmarkCaseId].parameterSetId === p.id).length; return `<tr><td>${esc(p.name)}</td><td>${p.category}</td><td>${v ? v + ' literature-reported' : pend('none')}</td><td>${pend('pending methodology')}</td></tr>`; }).join('')}</tbody></table></div>
  <p class="muted" style="margin-top:10px">${esc(s.limitations)} A category is not recomputed from any single estimate.</p>`;
}
function detailAttack(a) {
  if (!a) return '';
  const cases = casesForAttack(a.id);
  return `${tag(a.model)} ${tag(a.technique, 'tech')}
  <h3>${esc(a.name)}</h3><p class="lead"><span class="id num">${esc(a.id)}</span> · target: ${esc(a.targetGoal)}</p>
  <h4>High-level description</h4><p>${esc(a.description)}</p>
  <h4>Required assumptions and attack conditions</h4><ul>${a.assumptions.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <h4>Applicable schemes and parameter sets (${a.applicability.length})</h4>
  <div class="tbl-wrap"><table><thead><tr><th>Scheme</th><th>Parameter sets</th><th>Conditions</th></tr></thead><tbody>${a.applicability.map(ap => `<tr><td>${lnk('scheme', ap.schemeId, IDX.scheme[ap.schemeId].name)}</td><td>${esc(applicabilityText(ap))}</td><td class="sm">${esc(ap.conditions)}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted small">Applicability is explicit: schemes of the same family that are not listed here have not been assessed for this attack.</p>
  <h4>Associated benchmark cases (${cases.length})</h4>${caseRows(cases)}
  <h4>Status</h4><p>Resource estimation: ${tag(a.estimationStatus)} &nbsp; Validation: ${tag(a.validationStatus)}</p>
  <h4>Original paper or technical reference</h4>${refList(a.referenceIds)}`;
}
function detailCase(c) {
  if (!c) return '';
  const s = IDX.scheme[c.schemeId], a = IDX.attack[c.attackId], p = IDX.pset[c.parameterSetId], ap = a.applicability.find(x => x.schemeId === s.id), ests = estsForCase(c);
  const runs = ests.length ? ests.map(e => `<div class="panel" style="margin-bottom:12px"><p><b>${esc(e.id)}</b> · ${esc(e.source)} · ${tag(e.status)} ${e.estimatorVersion ? `<span class="sm">estimator version: ${esc(e.estimatorVersion)}</span>` : ''}</p>
    <div class="tbl-wrap"><table><tbody>${METRICS.map(m => { const v = fmtMetric(m.k, metricValue(e, m.k)); return `<tr><td class="sm">${esc(m.g)}</td><td>${esc(m.n)}</td><td class="num">${v == null ? pend('unavailable') : `<span class="num">${esc(v)}</span>`}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="sm muted" style="margin-top:8px"><b>Input configuration:</b> ${esc(Object.entries(e.inputConfig).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none recorded')}<br><b>Limitations:</b> ${esc(e.limitations)}</p></div>`).join('') : `<p class="empty">No estimate run recorded. This case defines the problem; the resource model will be filled by a literature value or a project estimator run.</p>`;
  return `${tag(c.model)} ${tag(c.evidenceStatus)} ${tag(c.validationStatus)} ${c.illustrative ? tag('illustrative example', 'illustrative') : ''}
  <h3>${esc(c.id)}</h3><p class="lead">${lnk('scheme', s.id, s.name)} · ${esc(p ? p.name : c.parameterSetId)} · ${lnk('attack', a.id, a.name)}</p>
  <h4>Problem definition</h4>
  <dl class="kv"><dt>scheme</dt><dd>${lnk('scheme', s.id, s.name)} (${esc(BS.statusLabels[s.status])})</dd><dt>parameter set</dt><dd>${esc(p ? p.name : c.parameterSetId)}${p ? ` · claimed category ${p.category}` : ''}</dd><dt>target goal</dt><dd>${esc(c.targetGoal)}</dd><dt>problem attacked</dt><dd>${esc(BS.families[s.familyId].problem)}</dd><dt>attack</dt><dd>${lnk('attack', a.id, a.name)} (${esc(a.technique)})</dd><dt>applicability</dt><dd>${esc(ap ? ap.conditions : 'not recorded')}</dd><dt>attack parameters</dt><dd>${esc(Object.entries(c.attackParams).map(([k, v]) => `${k}: ${v}`).join('; ') || 'none recorded')}</dd><dt>attack assumptions</dt><dd>${esc(a.assumptions.join('; '))}</dd></dl>
  <h4>Resource model · ${esc(c.estimationMethod)}</h4>
  <p class="sm muted" style="margin-bottom:10px">Computational assumptions: ${esc(Object.entries(c.assumptions).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'none recorded')}</p>${runs}
  <h4>Evidence and reproducibility</h4>
  <dl class="kv"><dt>references</dt><dd>${c.referenceIds.length ? c.referenceIds.map(id => esc((IDX.ref[id] || {citation: id}).citation)).join('<br>') : pend('none recorded')}</dd><dt>source code</dt><dd>${pend('not available')}</dd><dt>estimator version</dt><dd>${ests.some(e => e.estimatorVersion && e.estimatorVersion !== 'not connected') ? esc(ests.map(e => e.estimatorVersion).filter(Boolean).join(', ')) : pend('estimator not connected')}</dd><dt>validation</dt><dd>${tag(c.validationStatus)}</dd><dt>notes</dt><dd>${esc(c.notes)}</dd></dl>
  <div class="actions">${lnk('scheme', s.id, '← Back to ' + s.name)} ${lnk('attack', a.id, '← Back to attack')}</div>`;
}

