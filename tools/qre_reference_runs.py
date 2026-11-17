"""Reference runs of the newer QDK resource estimator (qdk.qre) for the logical counts Q-CARE uses.

The in-browser engine of Q-CARE is the QDK's JSON-driven estimator (qdk.estimator). The estimator that
Microsoft Learn now documents, qdk.qre, is a Python library with a native core and cannot run in a web page,
so its results are computed here and embedded in the page as data/qcare-qre-runs.json.

    pip install "qdk[qre]"
    node tools/export_counts.mjs
    python tools/qre_reference_runs.py
    python src/build_est.py && python src/make_site.py
"""
import datetime
import json
import pathlib
import warnings
from importlib.metadata import version

from qdk.estimator import LogicalCounts
from qdk.qre import LatticeSurgery, PSSPC, estimate, instruction_name
from qdk.qre.application import QSharpApplication
from qdk.qre.models import GateBased, GSJ24CCXFactory, RoundBasedFactory, SurfaceCode

root = pathlib.Path(__file__).resolve().parent.parent
targets = json.loads((root / "data" / "qcare-logical-counts.json").read_text())["targets"]

MAX_ERROR = 0.1
DISTANCES = list(range(3, 50, 2))
SLOW_DOWN = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0]
ARCHS = {
    "ns_e3": ("GateBased, 50 ns gates, 100 ns measurement, error 10⁻³", dict(error_rate=1e-3, gate_time=50, measurement_time=100)),
    "ns_e4": ("GateBased, 50 ns gates, 100 ns measurement, error 10⁻⁴", dict(error_rate=1e-4, gate_time=50, measurement_time=100)),
}

runs = []
for t in targets:
    app = QSharpApplication(LogicalCounts(t["counts"]))
    for arch_id, (arch_label, arch_kw) in ARCHS.items():
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            table = estimate(
                app,
                GateBased(**arch_kw),
                isa_query=SurfaceCode.q(distance=DISTANCES) * RoundBasedFactory.q() * GSJ24CCXFactory.q(),
                trace_query=PSSPC.q(ccx_magic_states=True) * LatticeSurgery.q(slow_down_factor=SLOW_DOWN),
                max_error=MAX_ERROR,
            )
        results = []
        for e in table:
            factories = ", ".join(f"{f.copies}×{instruction_name(i)}" for i, f in e.factories.items())
            results.append({"qubits": int(e.qubits), "runtime_s": e.runtime / 1e9, "error": float(e.error), "factories": factories})
        results.sort(key=lambda r: r["runtime_s"])
        run = {k: t[k] for k in ("id", "alg", "variant", "keyBits", "src", "counts")}
        run.update(arch=arch_id, archLabel=arch_label, results=results)
        if not results:
            run["note"] = "no result within the error budget" + (": " + str(caught[0].message).splitlines()[0][:160] if caught else "")
        runs.append(run)
        best = results[0] if results else None
        print(f'{t["id"]:26s} {arch_id}  {len(results)} results', f'fastest {best["qubits"]:,} qubits, {best["runtime_s"] / 3600:.2f} h, {best["factories"]}' if best else run["note"])

out = {
    "generated": datetime.date.today().isoformat(),
    "qdkVersion": version("qdk"),
    "settings": {
        "maxError": MAX_ERROR,
        "distances": [DISTANCES[0], DISTANCES[-1]],
        "slowDownFactors": SLOW_DOWN,
        "description": "surface code at distances 3 to 49, round-based T distillation feeding the 8T-to-CCX factory of "
        "Gidney, Shutty and Jones (2024, Fig. 24), PSSPC layout with lattice surgery at slow-down factors 1 to 8, "
        "and a total error budget of 0.1 per run.",
    },
    "runs": runs,
}
(root / "data" / "qcare-qre-runs.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
print("wrote data/qcare-qre-runs.json:", len(runs), "runs")
