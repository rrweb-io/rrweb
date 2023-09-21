#!/bin/bash
set -eux

# Move to the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $SCRIPT_DIR/..
OLD_VERSION="${1}"
NEW_VERSION="${2}"

# Do not tag and commit changes made by "npm version"
export npm_config_git_tag_version=false

yarn install --frozen-lockfile
# --force-publish - force publish all packages, this will skip the lerna changed check for changed packages and forces a package that didn't have a git diff change to be updated.
# --exact - specify updated dependencies in updated packages exactly (with no punctuation), instead of as semver compatible (with a ^).
# --no-git-tag-version - don't commit changes to package.json files and don't tag the release.
# --no-push - don't push committed and tagged changes.
# --include-merged-tags - include tags from merged branches when detecting changed packages.
# --yes - skip all confirmation prompts
yarn lerna version --force-publish --exact --no-git-tag-version --no-push --include-merged-tags --yes "${NEW_VERSION}"
