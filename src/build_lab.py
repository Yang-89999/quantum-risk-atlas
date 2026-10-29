"""Splice page 06 (Quantum Lab) into quantum-risk-atlas.html. Idempotent via markers."""
import pathlib, re
root = pathlib.Path(__file__).parent
p = root / 'quantum-risk-atlas.html'; h = p.read_text()
section = (root / 'frag_lab_section.html').read_text()
css = (root / 'frag_lab.css').read_text()

# 1. section: remove an earlier copy, insert before the references section
h = re.sub(r'<!-- ============ 06 QUANTUM LAB ============ -->.*?<!-- ============ 06 END ============ -->\n\n', '', h, flags=re.S)
anchor = '<section class="mod" id="refs" data-module="refs">'
assert h.count(anchor) == 1
h = h.replace(anchor, section + anchor)

# 2. sidebar link before References
nav_link = '    <a href="#quantum-lab" data-route="quantum-lab"><b>06</b><span>Quantum Lab</span></a>\n'
if 'data-route="quantum-lab"' not in h:
    a = '    <a href="#refs" data-route="refs"><b>§</b><span>References</span></a>'
    assert h.count(a) == 1
    h = h.replace(a, nav_link + a)

# 3. overview index entry + six columns
if 'href="#quantum-lab"><b>06</b>' not in h.split('<nav class="hero-idx"')[1].split('</nav>')[0]:
    a = '    <a href="#next"><b>05</b><span>Planned additions</span></a>\n  </nav>'
    assert h.count(a) == 1
    h = h.replace(a, '    <a href="#next"><b>05</b><span>Planned additions</span></a>\n    <a href="#quantum-lab"><b>06</b><span>Quantum Lab</span></a>\n  </nav>')
h = h.replace('.hero-idx { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(5, minmax(0,1fr));',
              '.hero-idx { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(6, minmax(0,1fr));')

# 4. route
old_routes = "const ROUTES = ['home', 'estimator', 'migration', 'products', 'pqc', 'next', 'refs'];"
new_routes = "const ROUTES = ['home', 'estimator', 'migration', 'products', 'pqc', 'next', 'quantum-lab', 'refs'];"
if old_routes in h: h = h.replace(old_routes, new_routes)
assert new_routes in h

# 5. CSS before the readiness-index block (outside the region the PQC build rewrites)
h = re.sub(r'/\* ---- Quantum Lab \(page 06\) ---- \*/.*?(?=/\* ---- readiness index introduction \(page 02\) ---- \*/)', '', h, flags=re.S)
marker = '/* ---- readiness index introduction (page 02) ---- */'
assert h.count(marker) == 1
h = h.replace(marker, css.rstrip() + '\n' + marker)

# 6. planned-additions page: note that 06 took the first slot
old_li = '    <ul>\n      <li>Harvest-now-decrypt-later exposure by data class'
new_li = '    <ul>\n      <li>Quantum Lab, the proposed AI-agent research system, now has its framework page at <a href="#quantum-lab">06</a>; research content, agent implementation and tools follow.</li>\n      <li>Harvest-now-decrypt-later exposure by data class'
if 'framework page at <a href="#quantum-lab">' not in h:
    assert h.count(old_li) == 1
    h = h.replace(old_li, new_li)

p.write_text(h)
print('spliced', len(h), 'bytes')
