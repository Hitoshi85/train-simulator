#!/usr/bin/env bash
# Builds the GitHub Pages site with two copies of the game:
#   <out>/      prod (the commit last promoted with "Ship")
#   <out>/dev/  dev  (the latest main)
# Usage: build-site.sh <prod-sha|.> <dev-sha|.> <out-dir> [prod-tag]
# Game files are taken from git, so each site gets exactly the files of its own commit.
# "." takes the files from the working tree instead (used by the tests, labelled with HEAD).
#
# Each copy is made to stay fresh on phones without a hard refresh:
#   - game.js and style.css are loaded as ?v=<short sha>, so a new page never pairs with old assets;
#   - index.html asks browsers to revalidate it (no-cache);
#   - a tiny check fetches version.json (never cached) on load and when the page is restored from
#     the back/forward cache, and reloads once onto the newer build if one has been deployed.
set -euo pipefail

resolve() { if [ "$1" = . ]; then git rev-parse HEAD; else git rev-parse --verify "$1^{commit}"; fi; }
prod_src=$1; dev_src=$2
prod_sha=$(resolve "$prod_src")
dev_sha=$(resolve "$dev_src")
out=$3
prod_tag=${4:-}

copy_game() { # <src> <sha> <dir> <env> <tag>
  local src=$1 sha=$2 dir=$3 env=$4 tag=$5 short=${2:0:7}
  mkdir -p "$dir"
  if [ "$src" = . ]; then
    cp index.html game.js style.css "$dir/"
    if [ -d assets ]; then cp -r assets "$dir/"; fi
  else
    for f in index.html game.js style.css; do git show "$sha:$f" > "$dir/$f"; done
    if git cat-file -e "$sha:assets" 2>/dev/null; then git archive "$sha" assets | tar -x -C "$dir"; fi
  fi
  # Lets the post-deploy check, the freshness check and anyone see which commit each site serves.
  printf '{"sha": "%s", "env": "%s", "tag": "%s"}\n' "$sha" "$env" "$tag" > "$dir/version.json"

  local html="$dir/index.html"
  sed -i -E "s/(game\.js|style\.css)(\?v=[^\"']*)?([\"'])/\1?v=${short}\3/g" "$html"
  local fresh='<meta http-equiv="Cache-Control" content="no-cache"><script id="fresh-check">(function(){var B="'"$sha"'";function check(){fetch("version.json?t="+Date.now(),{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(v){if(!v||!v.sha||v.sha===B)return;try{var k="aozora-fresh-"+v.sha;if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1")}catch(e){return}var u=new URL(location.href);u.searchParams.set("v",v.sha.slice(0,7));location.replace(u.href)}).catch(function(){})}check();addEventListener("pageshow",function(e){if(e.persisted)check()})})();</script>'
  sed -i "s@<meta charset=\"utf-8\">@<meta charset=\"utf-8\">\n${fresh}@" "$html"
  grep -q 'id="fresh-check"' "$html" || { echo "Freshness check not added to $html" >&2; exit 1; }
  grep -q "game.js?v=${short}" "$html" || { echo "game.js not versioned in $html" >&2; exit 1; }
  grep -q "style.css?v=${short}" "$html" || { echo "style.css not versioned in $html" >&2; exit 1; }
}

# The dev copy says it is dev: a small "DEV <sha>" tag at the top centre (it ignores taps, so it
# never gets in the way of the touch controls) and "DEV" at the start of the page title.
mark_dev() { # <dir> <sha>
  local html="$1/index.html" short=${2:0:7}
  local badge='<div id="env-badge" style="position:fixed;top:4px;left:50%;transform:translateX(-50%);z-index:9999;pointer-events:none;padding:2px 8px;border-radius:6px;background:#d6336c;color:#fff;font:700 12px/1.4 system-ui,sans-serif;letter-spacing:.08em;opacity:.9">DEV '"$short"'</div>'
  sed -i "s@</body>@${badge}\n</body>@; s@<title>@<title>DEV ${short} · @" "$html"
  grep -q 'id="env-badge"' "$html" && grep -q "<title>DEV ${short}" "$html" || { echo "DEV mark not added to $html" >&2; exit 1; }
}

rm -rf "$out"
copy_game "$prod_src" "$prod_sha" "$out" prod "$prod_tag"
copy_game "$dev_src" "$dev_sha" "$out/dev" dev ""
mark_dev "$out/dev" "$dev_sha"
echo "Built $out: prod ${prod_sha:0:7}${prod_tag:+ ($prod_tag)}, dev ${dev_sha:0:7}"
