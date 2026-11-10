#!/usr/bin/env bash
# Decides which commit each Pages site serves, for pages.yml's "plan" step.
# Run from inside the repository with all commits and tags fetched.
#
# Env in:
#   ACTION         deploy (main to dev), ship (dev to prod) or rollback (prod to an earlier release)
#   ROLLBACK_TAG   rollback only: the prod-N release to go back to (empty: the one before the current)
#   GITHUB_SHA     the commit this run is for (deploy puts it on dev)
#   SITE           the Pages base URL; ship and rollback read ${SITE}/dev/version.json
#   GITHUB_OUTPUT  file the outputs are appended to: prod_sha, prod_tag, dev_sha, new_release, prev_tag
# Tested by tests/plan.spec.js against throwaway git repositories.
set -euo pipefail

current_prod=$(git rev-parse -q --verify 'refs/tags/prod^{commit}' || true)
last_n=$(git tag -l 'prod-*' | sed 's/^prod-//' | grep -E '^[0-9]+$' | sort -n | tail -1 || true)
tag_of() { git tag -l 'prod-*' --points-at "$1" | sort -t- -k2 -n | tail -1; }

# What dev serves right now. Ship and rollback keep dev as it is, and Ship promotes exactly
# that commit, so they stop rather than guess when it cannot be read.
dev_live() {
  local sha
  sha=$(curl -fsS "${SITE}/dev/version.json?t=$(date +%s)" | jq -r .sha 2>/dev/null || true)
  if ! git cat-file -e "${sha:-none}^{commit}" 2>/dev/null; then
    echo "::error::Could not read which commit dev serves from ${SITE}/dev/version.json (got '${sha:-nothing}'). Nothing was changed; check that dev is live, then try again." >&2
    exit 1
  fi
  echo "$sha"
}

new_release=false
case "${ACTION:-}" in
  deploy)
    dev=$GITHUB_SHA
    if [ -n "$current_prod" ]; then prod=$current_prod; prod_tag=$(tag_of "$prod")
    else prod=$GITHUB_SHA; prod_tag='prod-1'; new_release=true; fi # first run: prod starts as today's game
    ;;
  ship)
    dev=$(dev_live); prod=$dev
    if [ "$prod" = "$current_prod" ]; then prod_tag=$(tag_of "$prod"); echo "::notice::Dev ${prod:0:7} is already prod."
    else prod_tag="prod-$(( ${last_n:-0} + 1 ))"; new_release=true; fi
    ;;
  rollback)
    dev=$(dev_live)
    if [ -n "${ROLLBACK_TAG:-}" ]; then prod_tag=$ROLLBACK_TAG
    else
      cur_n=$(tag_of "${current_prod:-none}" 2>/dev/null | sed 's/^prod-//' || true)
      prod_tag=$(git tag -l 'prod-*' | sed 's/^prod-//' | grep -E '^[0-9]+$' | sort -n \
        | awk -v cur="${cur_n:-0}" '$1 < cur + 0' | tail -1 | sed 's/^/prod-/' || true)
    fi
    [ -n "$prod_tag" ] || { echo "::error::There is no earlier prod release to roll back to."; exit 1; }
    prod=$(git rev-parse -q --verify "refs/tags/${prod_tag}^{commit}") || { echo "::error::No release called '$prod_tag'."; exit 1; }
    ;;
  *) echo "::error::Unknown action '${ACTION:-}'"; exit 1 ;;
esac

echo "Action $ACTION: prod ${prod:0:7} ($prod_tag), dev ${dev:0:7}"
{
  echo "prod_sha=$prod"
  echo "prod_tag=$prod_tag"
  echo "dev_sha=$dev"
  echo "new_release=$new_release"
  echo "prev_tag=$(tag_of "${current_prod:-none}" 2>/dev/null || true)"
} >> "$GITHUB_OUTPUT"
