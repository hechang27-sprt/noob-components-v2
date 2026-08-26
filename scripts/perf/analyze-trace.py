#!/usr/bin/env python3
"""Extract the interaction-flush metric from an agent-browser profiler trace.

Usage: analyze-trace.py trace.json [--min-task-ms 50]

flushMs = max RunMicrotasks duration (the Vue scheduler drain) - the reliable
signal for shell-wide size/theme switches. inputTaskMs = longest RunTask that
wraps that flush (best-effort; programmatic clicks may not emit input events).
"""
import json, sys

def main() -> int:
    args = sys.argv[1:]
    path = args[0] if args else "trace.json"
    min_task_ms = 50.0
    if "--min-task-ms" in args:
        min_task_ms = float(args[args.index("--min-task-ms") + 1])
    with open(path) as f:
        data = json.load(f)
    events = data.get("traceEvents", data if isinstance(data, list) else [])
    xs = [e for e in events if e.get("ph") == "X" and isinstance(e.get("dur"), (int, float))
          and isinstance(e.get("ts"), (int, float)) and e["dur"] > 0]
    if not xs:
        print(json.dumps({"error": "no X events"})); return 1
    base = min(e["ts"] for e in xs if e["ts"] > 1e12)
    rel = lambda e: round((e["ts"] - base) / 1000.0, 1)
    ms  = lambda e: round(e["dur"] / 1000.0, 1)
    micro = [e for e in xs if e["name"] == "RunMicrotasks"]
    flush = max(micro, key=lambda e: e["dur"]) if micro else None
    long_tasks = sorted([e for e in xs if e["dur"] / 1000.0 > min_task_ms],
                        key=lambda e: e["dur"], reverse=True)
    input_ms = 0.0
    if flush:
        for e in xs:
            if e["name"] == "RunTask" and e["ts"] <= flush["ts"] and e["ts"] + e["dur"] >= flush["ts"] + flush["dur"]:
                input_ms = max(input_ms, e["dur"] / 1000.0)
    out = {
        "flushMs": ms(flush) if flush else 0,
        "inputTaskMs": round(input_ms, 1),
        "longTaskCount": len(long_tasks),
        "totalLongMs": round(sum(e["dur"] / 1000.0 for e in long_tasks), 1),
        "tasks": [{"startMs": rel(e), "name": e["name"], "durMs": ms(e)} for e in long_tasks],
    }
    print(json.dumps(out, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
