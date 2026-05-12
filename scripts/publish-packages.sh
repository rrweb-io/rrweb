#!/usr/bin/env bash
# Publish all non-private workspace packages to npm via `pnpm publish`.
#
# Why `pnpm publish` (not `npm publish` directly, not `lerna publish`)?
#   - We use the `workspace:^` protocol for sibling deps in package.json.
#     The npm CLI does NOT rewrite `workspace:` specifiers at publish time —
#     it would publish tarballs containing the literal `"workspace:^"` string,
#     which is invalid on the registry. `pnpm publish` does this rewrite
#     (workspace:^ → ^X.Y.Z) before handing off to the npm CLI.
#   - `pnpm publish` (in pnpm 10+) delegates the actual upload to the npm
#     CLI, so it picks up npm 11.5.1+'s full OIDC trusted-publishing flow
#     (libnpmpublish 11.x), which lerna 8.2.4's bundled libnpmpublish 9.x
#     does not implement (lerna only supports OIDC for provenance signing,
#     not for trusted-publisher auth).
#
# Behaviour:
#   - Iterates packages in topological order (deps before dependents)
#   - Skips packages whose current package.json version is already on npm
#     (idempotent — safe to re-run after a partial publish)
#   - Runs the package's prepublish / prepublishOnly / prepack lifecycle
#     hooks as part of each publish invocation
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
packages_json="$(pnpm exec lerna list --json --toposort --no-private)"

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
    # --no-git-checks: the release workflow already validates branch+actor in
    # the authorize job; this just bypasses pnpm's own clean-tree check
    # (the prebuild reset in release.yml handles that).
    if [ -n "$DIST_TAG" ]; then
      pnpm publish --provenance --access public --no-git-checks --tag "$DIST_TAG"
    else
      pnpm publish --provenance --access public --no-git-checks
    fi
  )
done

echo "Publish complete."
