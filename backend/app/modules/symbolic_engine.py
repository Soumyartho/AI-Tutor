"""Deterministic symbolic engine (US-001 / US-002).

This module is the pedagogical core. Every step it emits is computed by SymPy —
never by an LLM. It is hardened per @GUARD:

* R-01: input length + AST-size caps BEFORE any expensive SymPy call; the actual
        solve runs under a hard timeout enforced by the caller (see run_with_timeout).
* R-02: parse_expr is called with an explicit restricted namespace and only the
        documented transformations — never eval/exec.
"""
from __future__ import annotations

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from app.core.config import get_settings
from app.schemas.models import Step, TreeNode

# convert_xor: treat '^' as exponentiation (student notation), not bitwise XOR.
_TRANSFORMATIONS = standard_transformations + (
    convert_xor,
    implicit_multiplication_application,
)

# R-02: the ONLY names user input may resolve to. No I/O, no expensive specials.
_ALLOWED_LOCALS: dict[str, object] = {
    "e": sp.E,
    "pi": sp.pi,
}


class ExpressionError(ValueError):
    """Raised on unparseable or disallowed input (maps to HTTP 422)."""


class ComplexityError(ValueError):
    """Raised when input exceeds @GUARD complexity caps (maps to HTTP 422)."""


# --------------------------------------------------------------------------- #
# Parsing (R-02) + complexity guards (R-01)
# --------------------------------------------------------------------------- #

def _guard_length(raw: str) -> None:
    settings = get_settings()
    if len(raw) > settings.max_expression_length:
        raise ComplexityError(
            f"Expression too long ({len(raw)} > {settings.max_expression_length} chars)."
        )


def _guard_node_count(expr: sp.Basic) -> None:
    settings = get_settings()
    count = sum(1 for _ in sp.preorder_traversal(expr))
    if count > settings.max_ast_nodes:
        raise ComplexityError(
            f"Expression too complex ({count} > {settings.max_ast_nodes} nodes)."
        )


def _parse_one(side: str) -> sp.Expr:
    # R-02: parse_expr uses SymPy's own namespace as the eval globals — it contains
    # NO Python builtins (no __import__, open, eval), so crafted strings resolve to
    # harmless SymPy Symbols/Functions or fail cleanly; arbitrary code cannot run.
    try:
        # evaluate=False preserves the student's written form (e.g. keeps 2x+4x
        # instead of collapsing to 6x at parse time) so the step engine has
        # something to transform, and so the AST mirrors what they typed.
        expr = parse_expr(
            side,
            local_dict=dict(_ALLOWED_LOCALS),
            transformations=_TRANSFORMATIONS,
            evaluate=False,
        )
    except Exception as exc:  # noqa: BLE001 — any parse failure is a user input error, not a 500
        raise ExpressionError(f"Could not parse '{side}': {exc}") from exc
    if not isinstance(expr, sp.Basic):
        raise ExpressionError(f"Input '{side}' did not parse to a valid expression.")
    _guard_node_count(expr)
    return expr


def parse_input(raw: str) -> tuple[sp.Expr, sp.Expr | None]:
    """Parse raw input into (lhs, rhs). rhs is None for a bare expression.

    Applies R-01 length guard first, then R-02 safe parse per side.
    """
    raw = raw.strip()
    _guard_length(raw)
    if not raw:
        raise ExpressionError("Empty expression.")
    if "__" in raw:
        # Defense-in-depth (R-02): dunder names have no legitimate math use and are
        # the classic vector for reaching Python internals. Reject outright.
        raise ExpressionError("Invalid characters in expression.")
    if raw.count("=") > 1:
        raise ExpressionError("Only a single '=' is supported.")
    if "=" in raw:
        left, right = raw.split("=", 1)
        return _parse_one(left), _parse_one(right)
    return _parse_one(raw), None


# --------------------------------------------------------------------------- #
# AST serialization (US-002)
# --------------------------------------------------------------------------- #

def _node_label(expr: sp.Basic) -> str:
    cls = type(expr).__name__
    if expr.is_Add:
        return "Sum"
    if expr.is_Mul:
        return "Product"
    if expr.is_Pow:
        return "Power"
    if expr.is_Symbol:
        return f"Variable {expr}"
    if expr.is_Number:
        return f"Number {expr}"
    return cls


def serialize_ast(expr: sp.Basic) -> TreeNode:
    """Recursively serialize a SymPy expression tree to a TreeNode (US-002)."""
    children = [serialize_ast(arg) for arg in expr.args]
    value = None
    if expr.is_Symbol or expr.is_Number:
        value = str(expr)
    return TreeNode(
        type=type(expr).__name__,
        value=value,
        latex=sp.latex(expr),
        label=_node_label(expr),
        children=children,
    )


# --------------------------------------------------------------------------- #
# Rule-based step generation (US-001)
# --------------------------------------------------------------------------- #

def _tex(expr: sp.Expr) -> str:
    return sp.latex(expr)


def _eq_tex(lhs: sp.Expr, rhs: sp.Expr) -> str:
    return f"{sp.latex(lhs)} = {sp.latex(rhs)}"


def _step(prev: str, op: str, label: str, new: str) -> Step:
    return Step(previous_state=prev, operation=op, operation_label=label, new_state=new)


def _needs_distribution(expr: sp.Basic) -> bool:
    """True if any product/power actually distributes over a sum."""
    for node in sp.preorder_traversal(expr):
        if node.is_Mul and any(arg.is_Add for arg in node.args):
            return True
        if node.is_Pow and node.base.is_Add and node.exp.is_Integer and node.exp >= 2:
            return True
    return False


def _simplify_expression_steps(expr: sp.Expr) -> tuple[list[Step], sp.Expr]:
    """Emit granular simplification steps for a bare expression.

    We separate DISTRIBUTE from COMBINE_LIKE_TERMS so the student sees the two
    cognitive moves distinctly, rather than a single opaque expand().
    """
    steps: list[Step] = []
    current = expr

    # 1. Distribution — only when a product/power genuinely spans a sum.
    if _needs_distribution(current):
        expanded = sp.expand(current)
        if expanded != current:
            steps.append(_step(_tex(current), "DISTRIBUTE", "Distribute / expand", _tex(expanded)))
            current = expanded

    # 2. Combine like terms.
    collected = sp.simplify(current)
    if collected != current:
        steps.append(_step(_tex(current), "COMBINE_LIKE_TERMS", "Combine like terms", _tex(collected)))
        current = collected

    # 3. Factor (only if it yields a genuine product form).
    factored = sp.factor(current)
    if factored != current and factored.is_Mul:
        steps.append(_step(_tex(current), "FACTOR", "Factor", _tex(factored)))
        current = factored

    return steps, current


def _solve_equation_steps(lhs: sp.Expr, rhs: sp.Expr) -> tuple[list[Step], str | None]:
    """Emit step-by-step solving for a (linear) equation."""
    steps: list[Step] = []

    # 1. Expand both sides if needed.
    lhs_e, rhs_e = sp.expand(lhs), sp.expand(rhs)
    if lhs_e != lhs or rhs_e != rhs:
        steps.append(_step(_eq_tex(lhs, rhs), "DISTRIBUTE", "Distribute on both sides",
                           _eq_tex(lhs_e, rhs_e)))
    lhs, rhs = lhs_e, rhs_e

    # 2. Move everything to the left: lhs - rhs = 0.
    moved = sp.expand(lhs - rhs)
    steps.append(_step(_eq_tex(lhs, rhs), "MOVE_TERMS",
                       "Move all terms to one side", f"{_tex(moved)} = 0"))

    # 3. Combine like terms.
    combined = sp.collect(moved, list(moved.free_symbols)) if moved.free_symbols else moved
    combined = sp.simplify(combined)
    if combined != moved:
        steps.append(_step(f"{_tex(moved)} = 0", "COMBINE_LIKE_TERMS",
                           "Combine like terms", f"{_tex(combined)} = 0"))

    # 4. Solve for the variable(s).
    symbols = sorted(combined.free_symbols, key=str)
    solution_latex: str | None = None
    if len(symbols) == 1:
        var = symbols[0]
        try:
            sols = sp.solve(sp.Eq(combined, 0), var, dict=False)
        except Exception as exc:  # noqa: BLE001 — surface as pedagogical failure, not 500
            raise ExpressionError(f"Could not solve for {var}: {exc}") from exc
        if sols:
            rendered = ", ".join(f"{sp.latex(var)} = {sp.latex(s)}" for s in sols)
            steps.append(_step(f"{_tex(combined)} = 0", "ISOLATE_VARIABLE",
                               f"Solve for {var}", rendered))
            solution_latex = rendered
    return steps, solution_latex


def generate_steps(lhs: sp.Expr, rhs: sp.Expr | None) -> tuple[list[Step], str | None]:
    """Top-level step generator. Deterministic: same input -> same steps."""
    if rhs is None:
        steps, final = _simplify_expression_steps(lhs)
        if not steps:
            steps.append(_step(_tex(lhs), "ALREADY_SIMPLIFIED",
                               "Already in simplest form", _tex(final)))
        return steps, _tex(final)
    return _solve_equation_steps(lhs, rhs)
