"""Logic jumps: which question comes next, given the answers so far.

Rules are evaluated in order; the first match wins. Jumps may only go
forward (to a later question or "end"), so a path can never loop. The
frontend runs the same algorithm (src/lib/logic.ts); the server uses it
to decide which questions a respondent actually saw, so skipped
questions are never required.
"""

from typing import Any

from app.schemas.definition import LogicRule, QuestionDef

END = "end"


def rule_matches(q: QuestionDef, rule: LogicRule, value: Any) -> bool:
    if value is None:
        return False
    if q.type == "multiple_choice":
        hit = rule.value in value
        return hit if rule.op == "is" else not hit
    if rule.op in ("gt", "lt"):
        if isinstance(value, bool) or not isinstance(value, int | float):
            return False
        if isinstance(rule.value, bool) or not isinstance(rule.value, int | float):
            return False
        return value > rule.value if rule.op == "gt" else value < rule.value
    # True must not equal 1 (Python says it does), so compare bools only with bools.
    same_kind = isinstance(value, bool) == isinstance(rule.value, bool)
    equal = same_kind and value == rule.value
    return equal if rule.op == "is" else not equal


def next_index(questions: list[QuestionDef], index: int, value: Any) -> int | None:
    """Index of the next question, or None when the form should end."""
    q = questions[index]
    position = {item.id: i for i, item in enumerate(questions)}
    for rule in q.logic:
        if not rule_matches(q, rule, value):
            continue
        if rule.goto == END:
            return None
        target = position.get(rule.goto)
        if target is not None and target > index:
            return target
    return index + 1 if index + 1 < len(questions) else None
