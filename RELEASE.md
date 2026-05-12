# Releasing rrweb

Releases of every `@amplitude/rrweb*` package are driven by **Lerna** in fixed-versioning mode, triggered manually via the `Release` GitHub Actions workflow.

## Triggering a release

Open the [`Release` workflow](https://github.com/amplitude/rrweb/actions/workflows/release.yml) → "Run workflow" → pick a `releaseType`:

| Type         | Branch required | What it does                                                                                                     |
| ------------ | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `release`    | `master`        | Bump versions via conventional commits, push commit + tag, publish to npm under `latest`, create GitHub Release. |
| `prerelease` | `alpha`         | Bump to `X.Y.Z-alpha.N`, push commit + tag, publish to npm under `alpha`.                                        |
| `dry-run`    | any             | Compute the next version locally without pushing or publishing. Use to preview what `release` would do.          |

The `authorize` job enforces branch + actor (write permission required).

### `skipVersion` (recovery)

Set `skipVersion: true` to skip the `lerna version` step and only run `lerna publish from-git`. Use this when a previous run pushed the version-bump commit + tag but the publish step failed — re-running with `skipVersion: true` republishes from the existing tag without bumping again.

## Prerelease lifecycle

Prereleases ride a short-lived `alpha` branch:

```sh
# Start a prerelease cycle
git checkout master && git pull
git checkout -b alpha
git push -u origin alpha
# Open PRs against alpha. Each merge is a candidate for `prerelease` runs.
# Trigger Release workflow with releaseType=prerelease as needed.

# Promote to GA: open a PR alpha → master, merge it, then run Release with releaseType=release.

# Clean up
git push origin --delete alpha
git branch -D alpha
```

Consumers install the latest prerelease with `npm install @amplitude/rrweb@alpha`.

## Release infrastructure

The workflow needs to push the version-bump commit and tag back to a ruleset-protected branch (`master` / `alpha`). The default `GITHUB_TOKEN` authenticates as the `github-actions` integration, which is not covered by the ruleset's bypass actors and would be rejected with `GH013: Changes must be made through a pull request`.

The fix: a write-enabled SSH **deploy key** is registered on the repo and added as a `DeployKey` bypass actor on the master ruleset. The workflow's `actions/checkout` step authenticates with the deploy key's private half (stored in `secrets.DEPLOY_KEY`), so the post-version push originates from a bypass-eligible identity.

### What's in place

| Resource                         | Where                                           | Purpose                                                                                                                   |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `semantic-release deploy key`    | Repo settings → Deploy keys                     | Write-enabled. Public half. (Name retained from initial setup; covers both Lerna and any future tool that needs to push.) |
| `DEPLOY_KEY` Actions secret      | Repo settings → Secrets and variables → Actions | Private half. Read by `actions/checkout` via `ssh-key:`.                                                                  |
| `DeployKey` bypass actor         | Master ruleset → Bypass list                    | Lets pushes signed with the key skip the "PR required" rule.                                                              |
| `amplitude-sdk-bot` git identity | `release.yml` env vars on the Release job       | Author of the version-bump commit.                                                                                        |

### Rotating the deploy key

```sh
# 1. Generate a new ed25519 keypair (no passphrase; required for CI).
KEYDIR=$(mktemp -d)
ssh-keygen -t ed25519 -C "rrweb-release@amplitude" -f "$KEYDIR/key" -N "" -q

# 2. Add the new public key as a deploy key (write enabled).
NEW_KEY_ID=$(gh api repos/amplitude/rrweb/keys -X POST \
  -f title='rrweb release deploy key' \
  -f key="$(cat $KEYDIR/key.pub)" \
  -F read_only=false --jq '.id')
echo "New deploy key id: $NEW_KEY_ID"

# 3. Replace the DEPLOY_KEY Actions secret.
gh secret set DEPLOY_KEY --repo amplitude/rrweb < "$KEYDIR/key"

# 4. Securely delete the local private key. GitHub now holds both halves.
shred -u "$KEYDIR/key" 2>/dev/null || rm -P "$KEYDIR/key"
rm "$KEYDIR/key.pub" && rmdir "$KEYDIR"

# 5. Delete the OLD deploy key from the repo.
gh api repos/amplitude/rrweb/keys/<OLD_KEY_ID> -X DELETE
```

The ruleset bypass actor is keyed on `DeployKey` (not a specific id), so it automatically covers the new key — no ruleset update needed.

### Initial bootstrap from scratch

If this repo ever loses its release credentials:

1. Run rotation steps 1–4 above to create the deploy key + secret.
2. Add the deploy key as a `DeployKey` bypass actor on the master ruleset:
   ```sh
   gh api repos/amplitude/rrweb/rulesets/<RULESET_ID> -X PUT --input ruleset.json
   ```
   with one additional entry in `bypass_actors`:
   ```json
   { "actor_id": null, "actor_type": "DeployKey", "bypass_mode": "always" }
   ```
3. Confirm `.github/workflows/release.yml` references `secrets.DEPLOY_KEY` in the checkout step.

## Troubleshooting

### `GH013: Changes must be made through a pull request`

The deploy key isn't bypassing the ruleset. Check, in order:

1. `DEPLOY_KEY` secret exists (`gh secret list --repo amplitude/rrweb`).
2. The checkout step has `ssh-key: ${{ secrets.DEPLOY_KEY }}`.
3. The master ruleset has a `DeployKey` bypass actor (`gh api repos/amplitude/rrweb/rulesets/<id>` → `bypass_actors`).
4. The deploy key has write access (`read_only: false` in `gh api repos/amplitude/rrweb/keys`).

### Lerna says "No changed packages to version"

No commits since the last tag carry a conventional `feat:` / `fix:` / `perf:` (or anything that produces a version bump under conventional commits). Add such a commit (typically a real change rather than a placeholder) and re-run.

### Wrong base version (e.g., starts from `1.0.0` when current is `2.x`)

Lerna reads `version` from `lerna.json`. Confirm it matches the latest published version (`npm view @amplitude/rrweb version`). If `lerna.json` and npm/git tags disagree, update `lerna.json` and commit before triggering the workflow.

### Tag pushed but no GitHub Release / npm publish

Check the workflow logs for failures after the `Version` step. The package.json versions on master and the npm registry are the source of truth for what was attempted vs. what landed; partial failures can be recovered by re-running the workflow with the same `releaseType` and `skipVersion: true` — this calls `lerna publish from-package` which compares package.json versions against npm and publishes the diff (idempotent, safe to re-run).

### `lerna publish` fails with `EUNCOMMIT Working tree has uncommitted changes`

Build prepublish hooks mutate tracked files (notably the `tsconfig.json` project references generated by `@monorepo-utils/workspaces-to-typescript-project-references`). The workflow's "Reset working tree" step (between Build and Version) reverts these so `lerna publish from-git` sees a clean tree. If you re-encounter this error, confirm that step is present in `release.yml` and that nothing new is being touched outside of `dist/` (which is gitignored) during build.

### `npm publish` fails with `E404 Not found`

OIDC trusted publishing isn't reaching the registry. npm publishing for this repo is configured to use [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers) (SR-3110, PR #89) — no static NPM_TOKEN should be in the publish flow. Common causes:

1. **`actions/setup-node` writes a poisoned `.npmrc`.** When configured with `registry-url:`, setup-node writes `_authToken=${NODE_AUTH_TOKEN}`. If an authToken is present (even a placeholder or stale value), npm uses it instead of attempting OIDC, and the registry returns 404. Confirm `actions/setup-node` does **not** set `registry-url:` and Publish steps do **not** set `NODE_AUTH_TOKEN`.

2. **The publish tool bundles an old `libnpmpublish`.** `libnpmpublish` 9.x and earlier only support OIDC for _provenance generation_, not for _auth_. OIDC trusted-publisher token exchange was added in libnpmpublish 11.x (shipped with npm 11.5.1+). Lerna 8.2.4 bundles libnpmpublish 9.x — that's why this repo publishes via `scripts/publish-packages.sh` (shells out to the npm CLI, which has the full OIDC auth flow) rather than `lerna publish`.

Confirm in `release.yml`:

- `actions/setup-node` does NOT set `registry-url:`
- Publish steps do NOT set `NODE_AUTH_TOKEN`
- `id-token: write` is in `permissions:` (so the OIDC token is available)
- `NPM_CONFIG_PROVENANCE: 'true'` on the Publish step (provenance attestation)
- Publish uses the npm CLI (via `scripts/publish-packages.sh`), not `lerna publish`
