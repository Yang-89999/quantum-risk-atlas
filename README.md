# Quantum Risk Atlas

A single-page, static site on the risk quantum computing poses to deployed cryptography, built for consulting and
estimation work. Live at **https://yang-89999.github.io/quantum-risk-atlas/**.

Everything the browser needs is in `index.html`, plus the photo in `img/`, the data module in `data/` and the QDK
estimator module in `vendor/qdk/`. There is no backend and no build step is required to view it: serve the folder
(`python3 -m http.server`). Opened straight from disk the page still works, but browsers do not load WebAssembly
from `file://`, so Q-CARE falls back to its built-in model.

## Pages

| Route | Page | Status |
| --- | --- | --- |
| `#home` | Overview and cover | — |
| `#estimator` (alias `#q-care`) | 01 Q-CARE, Quantum Cryptography Analysis & Resource Estimation (RSA, ECC, finite-field DLP, AES-Grover; deployed-algorithm picker, algorithm comparison, settings I–IV) | Physical layer computed by the open-source Microsoft QDK resource estimator running in the browser; a built-in placeholder model is the labelled fallback |
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
- **Page 01 (Q-CARE)** lives in `src/frag_model.js` (logical counts per published circuit, the QDK adapter and the
  built-in fallback model), `src/frag_est.js`, `src/frag_est_section.html`, `src/frag_est.css` and
  `src/frag_refs_lit.html`, spliced in by `src/build_est.py`.
- **Everything else** is edited directly in `src/quantum-risk-atlas.html`.

Rebuild after any change:

```
python3 src/build_pqc.py
python3 src/build_lab.py
python3 src/build_est.py
python3 src/make_site.py
```

`make_site.py` wraps the page body into the complete document `index.html`. Commit `index.html` together with the sources.

## Q-CARE and the QDK resource estimator

Q-CARE prices the physical machine with the resource estimator of the
[Microsoft Quantum Development Kit](https://github.com/microsoft/qdk) (MIT licence).

- `vendor/qdk/qcare_qdk_estimator_bg.wasm` is the QDK's own estimator crate (`source/resource_estimator`), unmodified,
  compiled to WebAssembly behind the one-function wrapper in `qdk-wasm/`. `vendor/qdk/QDK_COMMIT` records the QDK
  commit, `LICENSE-QDK.txt` its licence and `THIRD-PARTY-CRATES.txt` the Rust crates in the build.
  Rebuild with `qdk-wasm/build.sh` (needs Rust with the `wasm32-unknown-unknown` target and `wasm-bindgen-cli`).
- The page passes the QDK two JSON documents, the logical counts of one run of the chosen published circuit and the
  job parameters, and shows what comes back. The same documents give the same result in the QDK Python package
  (`pip install qdk`, `qdk.estimator.LogicalCounts(...).estimate(...)`); the page prints the snippet.
  The wrapper is used instead of the published `qsharp-lang` npm build because that build takes counts as 32-bit
  integers and several attack circuits exceed 2³² gates.
- The newer QDK estimator, `qdk.qre`, is a Python library and cannot run in a web page. Its reference runs are
  computed offline and embedded as data:

  ```
  pip install "qdk[qre]"
  node tools/export_counts.mjs          # data/qcare-logical-counts.json, from the page's own model
  python tools/qre_reference_runs.py    # data/qcare-qre-runs.json
  python3 src/build_est.py && python3 src/make_site.py
  ```

QDK figures describe the QDK's generic architecture. They are comparable with each other and are not the physical
numbers the source papers report for their own architectures; the page says so next to every figure.

## Deployment

`.github/workflows/pages.yml` publishes the repository root to GitHub Pages on every push to `main`.
If the first run reports that Pages is not enabled, open *Settings → Pages* and set *Source* to *GitHub Actions*, then re-run the workflow.

## Scope and labelling

On the Q-CARE page, logical counts are quoted from the published circuits in each paper's own units, the physical
layer is the QDK's (or the labelled built-in placeholder), and rows that rest on a project mapping or scaling say so.
The benchmark suite records literature values with their source and leaves everything else pending. The Quantum Lab page describes a proposal and does not claim any result.
