"""Splice the PQC Benchmark Suite fragments into quantum-risk-atlas.html.
Idempotent: markers delimit the replaced regions; the JSON data module is embedded from data/pqc-benchmark.json."""
import json, pathlib, re, sys
root = pathlib.Path(__file__).parent
html_p = root / 'quantum-risk-atlas.html'
html = html_p.read_text()
section = (root / 'frag_pqc_section.html').read_text()
css = (root / 'frag_pqc.css').read_text()
js = (root / 'frag_pqc.js').read_text()
data = json.loads((root.parent / 'data' / 'pqc-benchmark.json').read_text())  # validates the JSON
data_block = '<!-- PQC-DATA-START: data module, mirrored at data/pqc-benchmark.json -->\n<script type="application/json" id="pqc-data">' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>\n<!-- PQC-DATA-END -->\n'

# 1. section: from the 04 marker up to the 05 marker
start = html.index('<!-- ============ 04 ')
end = html.index('<!-- ============ 05 PLACEHOLDER ============ -->')
html = html[:start] + section + html[end:]
# 2. data block right before the main <script>
html = re.sub(r'<!-- PQC-DATA-START.*?<!-- PQC-DATA-END -->\n', '', html, flags=re.S)
html = html.replace('\n<script>\n/* ---------- 0. Shared model', '\n' + data_block + '<script>\n/* ---------- 0. Shared model', 1)
assert 'id="pqc-data"' in html
# 3. JS module: from the "4." header to the registry
js_start = html.index('/* ---------- 4. ')
js_end = html.index('/* ---------- registry')
html = html[:js_start] + js + html[js_end:]
# 4. CSS: insert/replace before the inner-page media block marker
html = re.sub(r'/\* ---- PQC Benchmark Suite \(page 04\) ---- \*/.*?(?=\n@media \(max-width: 900px\) \{\n  \.stats)', '', html, flags=re.S)
marker = '\n@media (max-width: 900px) {\n  .stats'
assert marker in html
html = html.replace(marker, '\n' + css.rstrip() + marker, 1)
html_p.write_text(html)
print('spliced', len(html), 'bytes;', len(data['schemes']), 'schemes', len(data['attacks']), 'attacks', len(data['benchmarkCases']), 'cases')
