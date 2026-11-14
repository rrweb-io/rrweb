#!/usr/bin/env python3
"""Verify the disabled migration changes only runner selection against a base ref."""
import argparse
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--base", default="3339038d31bc15491e9def76fd4f4818b2eae6aa")
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
expected = {
    "ci-cd.yml": {"release": 4, "webkit": 4},
    "bundle-stats.yml": {"build": 4},
    "eslint-check.yml": {"eslint_check_upload": 4},
    "style-check.yml": {"prettier": 2},
}
workflow_dir = root / ".github/workflows"
base_files = subprocess.check_output(
    ["git", "ls-tree", "--name-only", args.base, ".github/workflows/"], cwd=root, text=True
).splitlines()
current_files = sorted(str(p.relative_to(root)) for p in workflow_dir.glob("*.yml"))
assert sorted(base_files) == current_files, "Workflow inventory changed"
count = 0
for filename in current_files:
    current = (root / filename).read_text()
    original = subprocess.check_output(
        ["git", "show", f"{args.base}:{filename}"], cwd=root, text=True
    )
    name = Path(filename).name
    selected = expected.get(name, {})
    for job, size in selected.items():
        gate = (
            "    # Disabled until rrweb-io sponsorship and runner access are verified.\n"
            "    # Activation requires a reviewed edit; keep fork PRs on GitHub runners.\n"
            "    # See docs/ci/blacksmith-migration.md.\n"
            "    runs-on: >-\n"
            "      ${{ false && github.repository == 'rrweb-io/rrweb' &&\n"
            "          (github.event_name == 'push' ||\n"
            "           (github.event_name == 'pull_request' &&\n"
            "            github.event.pull_request.head.repo.full_name == github.repository)) &&\n"
            f"          'blacksmith-{size}vcpu-ubuntu-2404' || 'ubuntu-latest' }}}}\n"
        )
        match = re.search(rf"^  {re.escape(job)}:\n(?:(?!^  [^ ]).)*", current, re.M | re.S)
        assert match and match.group().count(gate) == 1, f"Missing disabled gate: {name}/{job}"
        current = current.replace(gate, "    runs-on: ubuntu-latest\n", 1)
        count += 1
    assert current == original, f"Change beyond allowed runner gates: {filename}"
assert count == 5
print(f"PASS: {len(base_files)} workflows; {count} disabled gates; all other workflow bytes unchanged")
# The literal false is intentional: no variable, event, input, or fork can enable usage.
# A future activation PR must deliberately revise this verifier along with the gates.
