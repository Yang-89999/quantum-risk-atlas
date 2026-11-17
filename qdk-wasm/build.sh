#!/usr/bin/env bash
# Builds vendor/qdk/qcare_qdk_estimator{.js,_bg.wasm} from the QDK source.
# Needs: git, a Rust toolchain with the wasm32-unknown-unknown target, and
# wasm-bindgen-cli at the version the QDK workspace pins (0.2.127 at the pinned commit).
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version 0.2.127 --locked
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
QDK_COMMIT="${QDK_COMMIT:-c25ff3ddbece0f5de535e2b9fc8dc840aec069fa}"
QDK_DIR="${QDK_DIR:-$here/.qdk-src}"
out="$here/../vendor/qdk"

if [ ! -d "$QDK_DIR/.git" ]; then
  git init -q "$QDK_DIR"
  git -C "$QDK_DIR" remote add origin https://github.com/microsoft/qdk
fi
if [ "$(git -C "$QDK_DIR" rev-parse HEAD 2>/dev/null || true)" != "$QDK_COMMIT" ]; then
  GIT_LFS_SKIP_SMUDGE=1 git -C "$QDK_DIR" fetch -q --depth 1 origin "$QDK_COMMIT"
  git -C "$QDK_DIR" checkout -q FETCH_HEAD
fi

# Add the wrapper as a workspace member so that it resolves against the QDK's Cargo.lock.
rm -rf "$QDK_DIR/source/qcare_wasm"
mkdir -p "$QDK_DIR/source/qcare_wasm/src"
cp "$here/Cargo.toml" "$QDK_DIR/source/qcare_wasm/Cargo.toml"
cp "$here/src/lib.rs" "$QDK_DIR/source/qcare_wasm/src/lib.rs"
grep -q '"source/qcare_wasm"' "$QDK_DIR/Cargo.toml" || \
  sed -i 's|    "source/wasm",|    "source/wasm",\n    "source/qcare_wasm",|' "$QDK_DIR/Cargo.toml"

( cd "$QDK_DIR" && QCARE_QDK_COMMIT="$QDK_COMMIT" cargo build --release --lib -p qcare_qdk_estimator --target wasm32-unknown-unknown )
mkdir -p "$out"
wasm-bindgen --target no-modules --no-typescript --out-dir "$out" \
  "$QDK_DIR/target/wasm32-unknown-unknown/release/qcare_qdk_estimator.wasm"
cp "$QDK_DIR/LICENSE.txt" "$out/LICENSE-QDK.txt"
echo "$QDK_COMMIT" > "$out/QDK_COMMIT"
{
  echo "Rust crates in the dependency tree of vendor/qdk/qcare_qdk_estimator_bg.wasm"
  echo "(cargo tree of the Q-CARE wrapper inside the QDK workspace at the commit in QDK_COMMIT;"
  echo " crates at v0.0.0 are QDK workspace members, MIT, see LICENSE-QDK.txt)."
  echo "Each crate's licence text is in its source distribution on crates.io."
  echo
  echo "crate | licence"
  ( cd "$QDK_DIR" && cargo tree -p qcare_qdk_estimator --target wasm32-unknown-unknown -e normal --prefix none --format "{p} | {l}" ) \
    | sed -E 's/ \(\/[^)]*\)//; s/ \(proc-macro\)//; s/ \(\*\)$//' | sort -u
} > "$out/THIRD-PARTY-CRATES.txt"
ls -la "$out"
