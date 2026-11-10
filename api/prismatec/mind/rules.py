"""Minimal deterministic rule evaluator with explicit unknown results."""
from __future__ import annotations
from typing import Any, Mapping

VALID_OUTCOMES = {"for", "against", "unknown"}

def evaluate(rules: list[Mapping[str, Any]], facts: Mapping[str, Any]) -> dict[str, Any]:
    results = []
    for rule in rules:
        key = rule.get("fact")
        expected = rule.get("equals")
        if not isinstance(key, str) or not key:
            raise ValueError("each rule needs a fact name")
        if key not in facts:
            outcome = "unknown"
        elif facts[key] == expected:
            outcome = "for"
        else:
            outcome = "against"
        results.append({"rule_id": str(rule.get("id", key)), "outcome": outcome, "fact": key})
    if any(r["outcome"] == "against" for r in results):
        conclusion = "against"
    elif results and all(r["outcome"] == "for" for r in results):
        conclusion = "for"
    else:
        conclusion = "unknown"
    return {"conclusion": conclusion, "authorized": False, "results": results}
