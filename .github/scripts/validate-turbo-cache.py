#!/usr/bin/env python3
"""Check real Turbo task hashes in an isolated copy, without running tasks."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--turbo", default="node_modules/.bin/turbo")
    parser.add_argument("--config-ref", help="Use turbo.json from a Git ref for regression checks")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    turbo = str(Path(args.turbo).resolve())
    env = {key: value for key, value in os.environ.items() if not key.startswith("TURBO_")}
    env.pop("DISABLE_WORKER_INLINING", None)
    env.pop("RELATIVE_CI_STATS", None)
    env["TURBO_TELEMETRY_DISABLED"] = "1"
    # A dry run computes hashes only. Never run builds or contact a remote cache.
    with tempfile.TemporaryDirectory(prefix="rrweb-turbo-hashes-") as directory:
        fixture = Path(directory)
        files = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
        for filename in filter(None, files):
            source = root / filename
            target = fixture / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        if args.config_ref:
            (fixture / "turbo.json").write_bytes(subprocess.check_output(
                ["git", "show", f"{args.config_ref}:turbo.json"], cwd=root
            ))
        subprocess.run(["git", "init", "--quiet"], cwd=fixture, check=True)
        subprocess.run(["git", "add", "."], cwd=fixture, check=True)

        def hashes(extra_env=None):
            result = subprocess.run(
                [turbo, "run", "prepublish", "--dry=json", "--no-daemon"],
                cwd=fixture, env={**env, **(extra_env or {})},
                check=True, capture_output=True, text=True,
            )
            report = json.loads(result.stdout)
            if report["turboVersion"] != "2.0.4":
                raise RuntimeError("Use the lockfile's Turbo 2.0.4 for this check")
            return {task["taskId"]: task["hash"] for task in report["tasks"]}

        baseline = hashes()
        if not baseline or baseline != hashes():
            raise RuntimeError("Unchanged inputs must produce stable task hashes")
        for name, value in (("DISABLE_WORKER_INLINING", "true"),
                            ("DISABLE_WORKER_INLINING", "false"),
                            ("RELATIVE_CI_STATS", "true")):
            changed = hashes({name: value})
            builds = [task for task in baseline if task.endswith("#prepublish")]
            if changed.keys() != baseline.keys() or not builds:
                raise RuntimeError("Task graph changed or contains no builds")
            if any(changed[task] == baseline[task] for task in builds):
                raise RuntimeError(f"{name}={value} did not invalidate every build")
            print(f"PASS: {name}={value} invalidates {len(builds)} build hashes")
        shared_config = fixture / "tsconfig.base.json"
        shared_config.write_text(shared_config.read_text() + "\n")
        changed = hashes()
        if changed.keys() != baseline.keys() or any(
            changed[task] == baseline[task] for task in baseline
        ):
            raise RuntimeError("Shared TypeScript config did not invalidate every task")
        print(f"PASS: tsconfig.base.json invalidates all {len(baseline)} task hashes")
        print("PASS: unchanged inputs are stable; no tasks or remote caches executed")


if __name__ == "__main__":
    main()
