// Q-CARE wrapper for the QDK resource estimator.
// Licensed under the MIT License, like the QDK code it calls.
//
// The QDK's published browser build (npm `qsharp-lang`) reaches the estimator only
// through a Q# program, and on wasm32 that path counts gates in 32-bit integers.
// This wrapper calls the estimator's own JSON entry point instead, which takes the
// logical counts as 64-bit integers, so counts above 2^32 are handled exactly.
// No estimator code is modified.

use wasm_bindgen::prelude::*;

/// Physical resource estimates from pre-computed logical counts.
///
/// `logical_counts`: JSON object, e.g. `{"numQubits":1399,"cczCount":6500000000}`
/// (keys: numQubits, tCount, rotationCount, rotationDepth, cczCount, ccixCount, measurementCount).
/// `params`: JSON array of job parameter objects (qubitParams, qecScheme, errorBudget,
/// constraints, estimateType, ...), or an empty string for the defaults.
/// Returns a JSON array with one result (or error object) per parameter set.
#[wasm_bindgen]
pub fn physical_estimates(logical_counts: &str, params: &str) -> Result<String, JsValue> {
    resource_estimator::estimate_physical_resources_from_json(logical_counts, params)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Commit of microsoft/qdk this module was built from (set by build.sh).
#[wasm_bindgen]
pub fn qdk_commit() -> String {
    option_env!("QCARE_QDK_COMMIT").unwrap_or("unknown").to_string()
}
