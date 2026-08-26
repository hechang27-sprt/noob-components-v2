#!/usr/bin/env bash
# Measure shell size/theme-switch lag using agent-browser's built-in profiler.
# Fast + fail-fast: fresh session, short deadlines, no long fixed sleeps.
# Env: PORT (5178) TABS (30) SCENARIOS (size theme) WT OUT AB_TIMEOUT.
set -uo pipefail
PORT="${PORT:-5178}"
SESSION="${SESSION:-perf-${PORT}}"
AB()  { timeout "${AB_TIMEOUT:-40}" agent-browser --session "$SESSION" "$@"; }
ABJ() { timeout "${AB_TIMEOUT:-40}" agent-browser --session "$SESSION" eval "$1" 2>/dev/null | tr -d '\n'; }
TABS="${TABS:-30}"
SCENARIOS="${SCENARIOS:-size theme}"
BASE_URL="http://localhost:${PORT}"
WT="${WT:-$PWD}"
OUT="${OUT:-/tmp/perf-measure}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$OUT"
say(){ echo "[measure] $*"; }
js(){ ABJ "$1"; }

# Poll up to `deadline` (sec) for a truthy eval result; exits 1 on timeout.
wait_truthy() {
  local expr="$1" deadline="${2:-3}" tries=0 t0=$SECONDS
  while [ $((SECONDS - t0)) -lt "$deadline" ]; do
    local got; got="$(js "$expr")"
    [ "$got" = true ] && return 0
    case "$got" in ''|0|false|null|undefined) ;; *) return 0 ;; esac
    sleep 0.1
  done
  return 1
}

ensure_server() {
  if ! curl -sf --max-time 3 -o /dev/null "$BASE_URL/"; then
    say "starting vite on :$PORT"
    ( cd "$WT" && nohup pnpm --filter demo exec vite --port "$PORT" --strictPort >"$OUT/vite.log" 2>&1 & )
    for _ in $(seq 1 45); do sleep 1; curl -sf --max-time 3 -o /dev/null "$BASE_URL/" && { say "server ready"; return 0; }; done
    echo "server did not start; tail:" >&2; tail -20 "$OUT/vite.log" >&2 || true; exit 1
  fi
  say "server already up on :$PORT"
}

login() {
  local attempt
  for attempt in 1 2 3; do
    timeout 30 agent-browser --session "$SESSION" close --all >/dev/null 2>&1 || true
    AB open "$BASE_URL/login" >/dev/null 2>&1 || true
    # Wait until the page is real (not blank): script tags + readyState.
    wait_truthy "document.readyState==='complete' && document.querySelectorAll('script').length>0" 12
    sleep 0.5
    local on_login
    on_login="$(js "!!document.querySelector('input')")"
    if [ "$on_login" = true ]; then
      js "(()=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; const ins=[...document.querySelectorAll('input')].filter(i=>i.type!=='checkbox'); if(ins[0]){ins.forEach((el,i)=>{s.call(el,i===0?'demo':'demo123'); el.dispatchEvent(new Event('input',{bubbles:true}));}); const b=[...document.querySelectorAll('button')].find(b=>/sign in/i.test(b.innerText)); if(b)b.click();} return 1;})()" >/dev/null
    fi
    if wait_truthy "!!document.querySelector('.n-menu-item-content')" 15; then
      say "post-login url=$(js 'location.href')"
      return 0
    fi
    say "login attempt $attempt failed (reopening)"
  done
  echo "login FAILED after 3 attempts" >&2
  return 1
}

spawn_tabs() {
  # Open report-detail tabs via the reports-page button; hard deadline overall.
  local want="$1" have=0 t0=$SECONDS
  local it=0
  say "spawn-start url=$(js 'location.href')"
  while [ "$have" -lt "$want" ] && [ $((SECONDS - t0)) -lt 90 ]; do
    it=$((it+1))
    js "(()=>{const a=document.querySelector('#app')?.__vue_app__; if(a)a.config.globalProperties.\$router.push('/reports'); return 1;})()" >/dev/null
    wait_truthy "!![...document.querySelectorAll('button')].find(b=>/quarterly|detail|详情|季度/i.test(b.innerText))" 3 || true
    local btn
    btn="$(js "!![...document.querySelectorAll('button')].find(b=>/quarterly|detail|详情|季度/i.test(b.innerText))")"
    js "(()=>{const b=[...document.querySelectorAll('button')].find(b=>/quarterly|detail|详情|季度/i.test(b.innerText)); if(b)b.click(); return 1;})()" >/dev/null
    sleep 0.15
    local nh; nh="$(js "document.querySelectorAll('[data-card-tab-role=tab]').length")"
    if [ "$nh" != "$have" ]; then have="$nh"; else
      [ $((it % 5)) -eq 0 ] && say "spawn it=$it have=$have btn=$btn url=$(js 'location.pathname')"
    fi
  done
  echo "$have"
}

switch_and_measure() {
  # Runs the scenario; if the measured flush is a no-op (<50ms) it retries
  # once with the opposite target so every report contains a real switch.
  local ctrl="$1" patA="$2" patB="$3" label="$4" stem="$5"
  local trial=0
  for pat in "$patA" "$patB"; do
    trial=$((trial+1))
    local out="$OUT/${stem}-t${trial}.json"
    timeout 15 agent-browser --session "$SESSION" profiler stop /dev/null >/dev/null 2>&1 || true
    AB profiler start >/dev/null 2>&1 || { echo "profiler start failed" >&2; return 1; }
    sleep 1.2
    js "(()=>{const b=document.querySelector('[data-admin-control=${ctrl}]'); if(b){for(const t of ['mouseenter','mouseover']) b.dispatchEvent(new MouseEvent(t,{bubbles:true}));} return 1;})()" >/dev/null
    wait_truthy "!!document.querySelector('.n-dropdown-menu')" 3
    js "(()=>{const o=[...document.querySelectorAll('.n-dropdown-option-body')].find(o=>/${pat}/i.test(o.innerText)); if(o)(o.closest('[role=menuitem]')||o).click(); return 1;})()" >/dev/null
    sleep 1.5
    AB profiler stop "$out" >/dev/null 2>&1 || { echo "profiler stop failed: $out" >&2; return 1; }
    echo "==== $label (target: $pat) ===="
    python3 "$SCRIPT_DIR/analyze-trace.py" "$out"
    # no-op detection: if the flush is tiny, try the alternate target next
    local flush; flush="$(python3 "$SCRIPT_DIR/analyze-trace.py" "$out" | sed -n 's/  "flushMs": \([0-9.]*\),/\1/p')"
    if [ "${flush%%.*}" -ge 50 ] 2>/dev/null; then return 0; fi
  done
}

main() {
  ensure_server
  if ! login; then
    echo "LOGIN FAILED — aborting" >&2
    exit 1
  fi
  say "login done"
  local have; have="$(spawn_tabs "$TABS")"
  say "UiCardTabs children: $have real tabs (target $TABS, took $((SECONDS))s)"
  for s in $SCENARIOS; do
    case "$s" in
      size)  switch_and_measure font-size "/small|小/" "/large|大/" "size @${have} tabs" "trace-size" ;;
      theme) switch_and_measure theme Midnight Ocean "theme @${have} tabs" "trace-theme" ;;
      *) echo "unknown scenario: $s" >&2 ;;
    esac
  done
}
main "$@"
