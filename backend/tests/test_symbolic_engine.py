"""Wave 1 verification: symbolic engine correctness + @GUARD guard rejection."""
from __future__ import annotations

import pytest

from app.modules import symbolic_engine as se
from app.modules.solve_service import _solve_job


def test_parse_implicit_multiplication():
    lhs, rhs = se.parse_input("2x + 4x")
    assert rhs is None
    assert lhs.free_symbols  # parsed 2x as 2*x, has symbol x


def test_combine_like_terms_expression():
    resp = _solve_job("2x + 4x")
    assert resp.solution_latex == "6 x"
    assert any(s.operation == "COMBINE_LIKE_TERMS" for s in resp.steps)


def test_linear_equation_solved():
    resp = _solve_job("2x + 4 = 12")
    assert resp.solution_latex is not None
    assert "4" in resp.solution_latex  # x = 4
    assert any(s.operation == "ISOLATE_VARIABLE" for s in resp.steps)


def test_distribution_step_present():
    resp = _solve_job("2*(x + 3)")
    assert any(s.operation == "DISTRIBUTE" for s in resp.steps)


def test_ast_serialization_has_latex():
    resp = _solve_job("x^2 + x*y")
    assert resp.ast.latex
    assert resp.ast.children  # Add node has children


def test_deterministic():
    a = _solve_job("3x + 2 = x + 10")
    b = _solve_job("3x + 2 = x + 10")
    assert [s.model_dump() for s in a.steps] == [s.model_dump() for s in b.steps]


def test_rejects_overlong_input():
    with pytest.raises(se.ComplexityError):
        se.parse_input("1+" * 500 + "1")  # exceeds max_expression_length


def test_rejects_too_many_nodes():
    # Deeply nested product that parses but blows the node cap.
    with pytest.raises((se.ComplexityError, se.ExpressionError)):
        se.parse_input("*".join(["x"] * 300))


def test_rejects_garbage():
    with pytest.raises(se.ExpressionError):
        se.parse_input("2x +/ ")


def test_no_code_execution():
    # __import__ must not resolve — restricted namespace (R-02).
    with pytest.raises(se.ExpressionError):
        se.parse_input("__import__('os')")
