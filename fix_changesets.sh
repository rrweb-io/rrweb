#!/bin/bash

CHANGESETS=".changeset"
ARCHIVE=".changeset-archive"

declare -a DELETED_PACKAGES
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-canvas-webrtc-record")
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-canvas-webrtc-replay")
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-console-record")
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-console-replay")
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-sequential-id-record")
DELETED_PACKAGES+=("@rrweb/rrweb-plugin-sequential-id-replay")
DELETED_PACKAGES+=("rrdom-nodejs")
DELETED_PACKAGES+=("@rrweb/web-extension")
DELETED_PACKAGES+=("plugins")

declare -a NEEDS_REVIEW

# Ensure archive directory exists
mkdir -p "$ARCHIVE"

# Function to check if a package is in the deleted list
is_deleted_package() {
  local pkg="$1"
  for deleted in "${DELETED_PACKAGES[@]}"; do
    if [[ "$pkg" == "$deleted" ]]; then
      return 0
    fi
  done
  return 1
}

# Function to extract package names from changeset frontmatter
extract_packages() {
  local file="$1"
  # Extract lines between --- markers, then grep for package lines
  sed -n '/^---$/,/^---$/p' "$file" | grep -E '^"[^"]+":' | sed -E 's/^"([^"]+)".*/\1/'
}

# Iterate over changeset files
if [[ -d "$CHANGESETS" ]]; then
  echo "Processing changesets for newrelic-forks/rrweb"
  echo ""

  for file in "$CHANGESETS"/*.md; do
    # Skip README and non-md files
    if [[ ! -f "$file" ]] || [[ "$(basename "$file")" == "README.md" ]]; then
      continue
    fi

    echo "Processing: $(basename "$file")"

    # Extract all packages referenced in this changeset
    packages=($(extract_packages "$file"))

    # Skip if no packages found (empty changeset)
    if [[ ${#packages[@]} -eq 0 ]]; then
      echo "  ℹ️  Empty changeset, skipping"
      echo ""
      continue
    fi

    # Count deleted vs valid packages
    deleted_count=0
    total_count=${#packages[@]}

    for pkg in "${packages[@]}"; do
      if is_deleted_package "$pkg"; then
        ((deleted_count++))
      fi
    done

    # Scenario 1: ALL packages are deleted - move to archive
    if [[ $deleted_count -eq $total_count ]]; then
      echo "  ✓ All packages deleted, moving to archive"
      mv "$file" "$ARCHIVE/"
      echo ""
      continue
    fi

    # Scenario 2 & 3: Has valid packages - perform string replacements
    echo "  → Applying package name fixes..."

    # Fix @rrweb/* scope to @newrelic/rrweb-*
    sed -i '' 's/"@rrweb\/record":/"@newrelic\/rrweb-record":/g' "$file"
    sed -i '' 's/"@rrweb\/replay":/"@newrelic\/rrweb-replay":/g' "$file"
    sed -i '' 's/"@rrweb\/all":/"@newrelic\/rrweb-all":/g' "$file"
    sed -i '' 's/"@rrweb\/packer":/"@newrelic\/rrweb-packer":/g' "$file"
    sed -i '' 's/"@rrweb\/utils":/"@newrelic\/rrweb-utils":/g' "$file"

    # Fix bare package names (missing scope)
    sed -i '' 's/^"record":/"@newrelic\/rrweb-record":/g' "$file"
    sed -i '' 's/^"replay":/"@newrelic\/rrweb-replay":/g' "$file"
    sed -i '' 's/^"all":/"@newrelic\/rrweb-all":/g' "$file"
    sed -i '' 's/^"packer":/"@newrelic\/rrweb-packer":/g' "$file"
    sed -i '' 's/^"utils":/"@newrelic\/rrweb-utils":/g' "$file"
    sed -i '' 's/^"types":/"@newrelic\/rrweb-types":/g' "$file"
    sed -i '' 's/^"rrweb":/"@newrelic\/rrweb":/g' "$file"
    sed -i '' 's/^"rrweb-player":/"@newrelic\/rrweb-player":/g' "$file"
    sed -i '' 's/^"rrweb-snapshot":/"@newrelic\/rrweb-snapshot":/g' "$file"
    sed -i '' 's/^"rrdom":/"@newrelic\/rrdom":/g' "$file"
    sed -i '' 's/^"rrvideo":/"@newrelic\/rrvideo":/g' "$file"

    # If file contains deleted packages, remove those lines from frontmatter
    if [[ $deleted_count -gt 0 ]]; then
      echo "  → Removing deleted package references..."
      for deleted_pkg in "${DELETED_PACKAGES[@]}"; do
        # Escape special characters for sed
        escaped_pkg=$(echo "$deleted_pkg" | sed 's/[\/&]/\\&/g')
        # Delete lines matching the deleted package
        sed -i '' "/^\"$escaped_pkg\":/d" "$file"
      done
      echo "  ⚠️  Needs manual review - verify changeset description is still accurate"
      NEEDS_REVIEW+=("$file")
    else
      echo "  ✓ Fixed"
    fi

    echo ""
  done

  # Summary
  echo "=========================================="
  echo "Processing complete!"
  echo ""

  if [[ ${#NEEDS_REVIEW[@]} -gt 0 ]]; then
    echo "⚠️  Files needing manual review (deleted package references removed):"
    for file in "${NEEDS_REVIEW[@]}"; do
      echo "  - $(basename "$file")"
    done
    echo ""
    echo "    These files had deleted package references automatically removed."
    echo "    Please review and update the changeset description if needed."
  else
    echo "✓ All changesets processed successfully!"
  fi

else
  echo "Directory $CHANGESETS does not exist. Exiting."
  exit 1
fi
