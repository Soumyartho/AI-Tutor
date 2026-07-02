"""Solve service: orchestrates parse -> AST -> steps under the R-01 timeout.

The heavy work lives in a module-level function (`_solve_job`) so it is picklable
and can be dispatched to the ProcessPoolExecutor by run_with_timeout.
"""
from __future__ import annotations

import sympy as sp

from app.modules import symbolic_engine as se
from app.schemas.models import SolveResponse


def _solve_job(raw: str) -> SolveResponse:
    """CPU-bound work run inside a timeout-guarded worker process (R-01)."""
    lhs, rhs = se.parse_input(raw)
    ast_root = lhs if rhs is None else sp.Eq(lhs, rhs, evaluate=False)
    ast = se.serialize_ast(ast_root)
    steps, solution = se.generate_steps(lhs, rhs)
    input_latex = se._tex(lhs) if rhs is None else se._eq_tex(lhs, rhs)
    return SolveResponse(
        input_latex=input_latex,
        ast=ast,
        steps=steps,
        solution_latex=solution,
    )
