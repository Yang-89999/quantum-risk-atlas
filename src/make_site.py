"""Wrap src/quantum-risk-atlas.html (the page body: title line, fonts link, <style>, markup, <script>)
into a complete HTML document at ../index.html for static hosting such as GitHub Pages."""
import pathlib
root = pathlib.Path(__file__).resolve().parent
src = (root / 'quantum-risk-atlas.html').read_text()
lines = src.split('\n')
assert lines[0].startswith('<title>') and lines[2].startswith('<link rel="stylesheet"'), 'unexpected page header'
fonts = lines[2]
style_start = src.index('<style>'); style_end = src.index('</style>') + len('</style>')
style = src[style_start:style_end]
body = src[style_end:].strip('\n')
desc = ("How soon does a quantum computer break your cryptography? A tunable resource estimator, a quantum-safe "
        "readiness index, product concepts, a PQC benchmark suite and a proposed AI-agent research lab.")
icon = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
        "%3Ccircle cx='16' cy='16' r='14' fill='%238B7CF2'/%3E%3Ccircle cx='12' cy='12' r='7' fill='%23F19AD0'/%3E"
        "%3Crect x='10' y='15' width='12' height='10' rx='2' fill='%23111'/%3E%3C/svg%3E")
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Quantum Risk Atlas</title>
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E0E0E" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="Quantum Risk Atlas">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:image" content="img/dilution-fridge.jpg">
<link rel="icon" href="{icon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
{style}
</head>
<body>
{body}
</body>
</html>
"""
(root.parent / 'index.html').write_text(html)
print('wrote', root.parent / 'index.html', len(html), 'bytes')
