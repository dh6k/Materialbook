#!/usr/bin/env bash
# Mirror non-rebrand commits from main onto pr_ready.
#
# Runs with pr_ready checked out. Rebrand-owned paths are NEVER mirrored
# (package rename, fork README, release versions). A commit touching only
# those is skipped. Any other commit is cherry-picked; on conflict it is
# skipped and reported so a human can port it by hand (the package rename
# conflicts with nearly every code change by design).
#
# Usage (local dry run): scripts/sync-pr-ready.sh [--dry-run]
set -u

TARGET="pr_ready"
BASE="main"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

# Paths owned by the fork rebrand — never mirrored.
REBRAND_PATHS=(
  "README.md"
  "CHANGE.md"
  "CHANGE.txt"
  "app/build.gradle.kts"
  "app/src/main/java/vip/"
  "app/src/androidTest/java/vip/"
  "app/src/test/java/vip/"
)

git fetch origin "$TARGET" "$BASE" >/dev/null 2>&1 || true
mapfile -t COMMITS < <(git log --format=%H --reverse "origin/$TARGET..origin/$BASE" 2>/dev/null)
if [ "${#COMMITS[@]}" -eq 0 ]; then
  echo "pr_ready is up to date with main (nothing to mirror)."
  exit 0
fi

is_rebrand_only() {
  local sha="$1" f
  mapfile -t files < <(git diff-tree --no-commit-id --name-only -r "$sha")
  [ "${#files[@]}" -eq 0 ] && return 0
  for f in "${files[@]}"; do
    local owned=false p
    for p in "${REBRAND_PATHS[@]}"; do
      if [[ "$f" == "$p"* ]]; then owned=true; break; fi
    done
    $owned || return 1
  done
  return 0
}

if ! $DRY_RUN; then
  git checkout -q "$TARGET"
  git reset -q --hard "origin/$TARGET"
fi
mirrored=()
skipped_rebrand=()
conflicted=()

for sha in "${COMMITS[@]}"; do
  subject="$(git log -1 --format=%s "$sha")"
  # Known rebrand/release commits are never mirrored, even though they touch
  # code paths (the package rename moves every source file by design).
  if [[ "$subject" == "fork: rebrand"* || "$subject" == "Release: "* ]]; then
    skipped_rebrand+=("$sha $subject")
    continue
  fi
  if is_rebrand_only "$sha"; then
    skipped_rebrand+=("$sha $subject")
    continue
  fi
  if $DRY_RUN; then
    mirrored+=("$sha $subject (dry run)")
    continue
  fi
  if git cherry-pick "$sha" >/dev/null 2>&1; then
    mirrored+=("$sha $subject")
  else
    git cherry-pick --abort >/dev/null 2>&1 || true
    conflicted+=("$sha $subject")
  fi
done

if ! $DRY_RUN && [ "${#mirrored[@]}" -gt 0 ]; then
  git push origin "$TARGET"
fi

echo "## Mirror report ($BASE -> $TARGET)"
echo "### Mirrored (${#mirrored[@]})"
if [ "${#mirrored[@]}" -gt 0 ]; then printf '%s\n' "${mirrored[@]}"; else echo "(none)"; fi
echo "### Skipped, rebrand-only (${#skipped_rebrand[@]})"
if [ "${#skipped_rebrand[@]}" -gt 0 ]; then printf '%s\n' "${skipped_rebrand[@]}"; else echo "(none)"; fi
echo "### Conflicted, needs hand port (${#conflicted[@]})"
if [ "${#conflicted[@]}" -gt 0 ]; then printf '%s\n' "${conflicted[@]}"; else echo "(none)"; fi

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "mirrored=${#mirrored[@]}"
    echo "skipped=${#skipped_rebrand[@]}"
    echo "conflicted<<EOF"
    if [ "${#conflicted[@]}" -gt 0 ]; then printf '%s\n' "${conflicted[@]}"; fi
    echo "EOF"
  } >> "$GITHUB_OUTPUT"
fi
