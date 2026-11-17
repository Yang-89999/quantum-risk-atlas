"""Splice the page-01 estimator fragments into quantum-risk-atlas.html (idempotent, marker-based).
   frag_model.js        -> replaces /* ---------- 0. Shared model */ ... up to /* ---------- formatting */
   frag_est.js          -> replaces /* ---------- 1. Estimator module */ ... up to /* ---------- 2. Migration module */
   frag_est_section.html-> replaces <!-- ============ 01 ... up to <!-- ============ 02
   frag_est.css         -> inserted before the readiness-index CSS block (after any previous copy is removed)
   frag_refs_lit.html   -> appended after the Microsoft Quantum reference (after any previous copy is removed)
   ../data/qcare-qre-runs.json -> embedded as <script type="application/json" id="qre-data"> before the pqc-data block
"""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent
page = root / 'quantum-risk-atlas.html'
html = page.read_text()

def replace_between(text, start, end, new, keep_end=True):
    i = text.index(start); j = text.index(end, i)
    return text[:i] + new + (text[j:] if keep_end else text[j + len(end):])

html = replace_between(html, '/* ---------- 0. Shared model (pure) ---------- */', '/* ---------- formatting ---------- */', (root / 'frag_model.js').read_text())
html = replace_between(html, '/* ---------- 1. Estimator module ---------- */', '/* ---------- 2. Migration module ---------- */', (root / 'frag_est.js').read_text())
sec_start = next(m for m in ('<!-- ============ 01 Q-CARE (RESOURCE ESTIMATION) ============ -->', '<!-- ============ 01 RESOURCE ESTIMATOR ============ -->') if m in html)
html = replace_between(html, sec_start, '<!-- ============ 02 MIGRATION', (root / 'frag_est_section.html').read_text())

# qdk.qre reference runs (data/qcare-qre-runs.json, written by tools/qre_reference_runs.py), embedded as inline JSON
qre = (root.parent / 'data' / 'qcare-qre-runs.json').read_text().strip().replace('</', '<\\/')
qre_tag = '<script type="application/json" id="qre-data">'
if qre_tag in html:
    i = html.index(qre_tag); j = html.index('</script>', i) + len('</script>\n')
    html = html[:i] + html[j:]
pqc_tag = '<script type="application/json" id="pqc-data">'
html = html.replace(pqc_tag, qre_tag + qre + '</script>\n' + pqc_tag, 1)

css = (root / 'frag_est.css').read_text()
css_start = '/* ---- estimator anchors and variant notes (page 01) ---- */'
ridx = '/* ---- readiness index introduction (page 02) ---- */'
if css_start in html:
    i = html.index(css_start); j = html.index(ridx, i)
    html = html[:i] + html[j:]
html = html.replace(ridx, css + ridx, 1)

refs = (root / 'frag_refs_lit.html').read_text()
marker = '<!-- refs-lit-review'
if marker in html:
    i = html.index(marker); i = html.rindex('\n', 0, i) + 1
    j = html.index('  </ol>', i)
    html = html[:i] + html[j:]
ms = html.index('<li>Microsoft Quantum, “Resource estimator for quantum cryptography”')
ms_end = html.index('</li>', ms) + len('</li>\n')
html = html[:ms_end] + refs + html[ms_end:]

page.write_text(html)
n_refs = len(re.findall(r'<li>', html[html.index('<ol class="refs">'):html.index('</ol>', html.index('<ol class="refs">'))]))
print('built', page.name, len(html), 'bytes;', n_refs, 'references')
