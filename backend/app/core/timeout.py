"""Hard wall-clock timeout for CPU-bound symbolic work (R-01).

SymPy calls are not cooperatively cancellable and `signal.alarm` is unavailable
on Windows and inside worker threads, so we run the work in a separate process
and kill it if it overruns. A ProcessPoolExecutor is reused across requests to
avoid per-call fork/spawn cost.
"""
from __future__ import annotations

import concurrent.futures
from typing import Callable, TypeVar

T = TypeVar("T")

# Sized conservatively; symbolic solving is CPU-bound so we tie this to cores,
# not request concurrency (per @ARCH scaling note).
_executor: concurrent.futures.ProcessPoolExecutor | None = None


class SolveTimeoutError(Exception):
    """Raised when a symbolic operation exceeds its time budget (R-01)."""


def _get_executor() -> concurrent.futures.ProcessPoolExecutor:
    global _executor
    if _executor is None:
        _executor = concurrent.futures.ProcessPoolExecutor(max_workers=2)
    return _executor


def run_with_timeout(fn: Callable[..., T], *args: object, timeout: float) -> T:
    """Run `fn(*args)` in a worker process, killing it if it exceeds `timeout`."""
    executor = _get_executor()
    future = executor.submit(fn, *args)
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError as exc:
        # Kill the runaway worker so it can't keep burning CPU. The pool
        # transparently replaces the dead process for subsequent requests.
        for pid, proc in list(getattr(executor, "_processes", {}).items()):
            proc.terminate()
        raise SolveTimeoutError("Symbolic computation timed out.") from exc


def shutdown() -> None:
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=False, cancel_futures=True)
        _executor = None
