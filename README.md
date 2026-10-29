# Quantum Risk Atlas

A single-page, static site on the risk quantum computing poses to deployed cryptography, built for consulting and
estimation work. Live at **https://yang-89999.github.io/quantum-risk-atlas/** once GitHub Pages is enabled.

Everything the browser needs is in `index.html`, plus the photo in `img/` and the data module in `data/`.
There is no backend and no build step is required to view it: open `index.html` or serve the folder.

## Pages

| Route | Page | Status |
| --- | --- | --- |
| `#home` | Overview and cover | — |
| `#estimator` | 01 Resource estimator (RSA, ECC, finite-field DLP, AES-Grover; settings I–IV) | **Provisional model**: the numbers come from a placeholder in `estimate()` and are labelled as such |
| `#migration` | 02 Migration and the Quantum-Safe Readiness Index (3 categories, 14 indicators, Mosca X+Y vs Z) | Indicator wording and weights are this project's own |
| `#products` | 03 Quantum-safe product concepts | — |
| `#pqc` | 04 PQC Benchmark Suite (schemes, attacks, benchmark cases, resource estimates) | Data model and UI only; no estimation is computed |
| `#next` | 05 Planned additions | — |
| `#quantum-lab` | 06 Quantum Lab, a proposed AI-agent research system | Research proposal; nothing is running |
| `#refs` | References | — |

## Editing

- **Data for page 04** lives in `data/pqc-benchmark.json` (schema 0.1.0: families, schemes, attacks, benchmarkCases,
  resourceEstimates, references, linked by stable IDs). Missing values are `null` and render as pending; never invent them.
- **Page 04 and page 06 markup** live in `src/frag_*.html|css|js` and are spliced into `src/quantum-risk-atlas.html`
  by `src/build_pqc.py` and `src/build_lab.py`.
- **Everything else** is edited directly in `src/quantum-risk-atlas.html`.

Rebuild after any change:

```
python3 src/build_pqc.py
python3 src/build_lab.py
python3 src/make_site.py
```

`make_site.py` wraps the page body into the complete document `index.html`. Commit `index.html` together with the sources.

## Deployment

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on every push to `main`.
If the first run reports that Pages is not enabled, open *Settings → Pages* and set *Source* to *GitHub Actions*, then re-run the workflow.

## Scope and labelling

Figures on the estimator page are provisional. The benchmark suite records literature values with their source and
leaves everything else pending. The Quantum Lab page describes a proposal and does not claim any result.
