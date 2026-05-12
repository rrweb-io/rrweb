#!/usr/bin/env bash
# Publish all non-private workspace packages to npm via the npm CLI.
#
# Why not `lerna publish`?
#   lerna 8.2.4 bundles libnpmpublish 9.x, whose OIDC support is limited to
#   provenance signing — it does not implement trusted-publisher token
#   exchange for auth (added in libnpmpublish 11.x). Calling the npm CLI
#   directly gets us npm 11.5.1+'s full OIDC trusted-publishing flow.
#
# Behaviour:
#   - Iterates packages in topological order (deps before dependents)
#   - Skips packages whose current package.json version is already on npm
#     (idempotent — safe to re-run after a partial publish)
#   - Runs the package's prepublish / prepublishOnly / prepack lifecycle
#     hooks as part of each `npm publish` invocation
#
# Usage:
#   scripts/publish-packages.sh             # publish under the default tag (latest)
#   scripts/publish-packages.sh alpha       # publish under the alpha dist-tag
#
# Env:
#   NPM_CONFIG_PROVENANCE=true   request provenance attestation
#   ACTIONS_ID_TOKEN_REQUEST_*   set by GitHub Actions when id-token: write
#                                permission is granted; npm uses these to
#                                exchange for an npm publish credential

set -euo pipefail

DIST_TAG="${1:-}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

# Topologically sorted list of non-private workspace packages.
packages_json="$(yarn -s lerna list --json --toposort --no-private)"

echo "$packages_json" | jq -c '.[]' | while IFS= read -r entry; do
  name="$(echo "$entry" | jq -r '.name')"
  version="$(echo "$entry" | jq -r '.version')"
  location="$(echo "$entry" | jq -r '.location')"

  # Check if this exact version is already on the registry.
  if npm view "${name}@${version}" version >/dev/null 2>&1; then
    echo "  ✓ ${name}@${version} already on npm — skipping"
    continue
  fi

  echo "  ▶ Publishing ${name}@${version}"
  (
    cd "$location"
    if [ -n "$DIST_TAG" ]; then
      npm publish --provenance --access public --tag "$DIST_TAG"
    else
      npm publish --provenance --access public
    fi
  )
done

echo "Publish complete."
