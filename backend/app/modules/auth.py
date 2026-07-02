"""Firebase JWT verification (US-006), stateless, per @ARCH.

Verifies Firebase-issued ID tokens against Google's public JWKS using RS256.
JWKS is cached with a TTL and refreshed on an unknown `kid` (R-05) rather than
fetched on every request.

When `AUTH_REQUIRED=false` (local dev without Firebase configured), a stub user
is injected so the rest of the API remains exercisable.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import jwt
from jose.exceptions import JWTError

from app.core.config import Settings, get_settings

_GOOGLE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
)
_ISSUER_PREFIX = "https://securetoken.google.com/"


@dataclass
class CurrentUser:
    uid: str
    email: str | None = None


class _JwksCache:
    def __init__(self) -> None:
        self._certs: dict[str, str] = {}
        self._expires_at: float = 0.0

    def get(self, kid: str, *, force_refresh: bool = False) -> str | None:
        now = time.time()
        if force_refresh or now >= self._expires_at or kid not in self._certs:
            self._refresh()
        return self._certs.get(kid)

    def _refresh(self) -> None:
        resp = httpx.get(_GOOGLE_CERTS_URL, timeout=5.0)
        resp.raise_for_status()
        self._certs = resp.json()
        # Respect Google's Cache-Control max-age when present (R-05).
        max_age = 3600
        cache_control = resp.headers.get("cache-control", "")
        for part in cache_control.split(","):
            part = part.strip()
            if part.startswith("max-age="):
                try:
                    max_age = int(part.split("=", 1)[1])
                except ValueError:
                    pass
        self._expires_at = time.time() + max_age


_jwks_cache = _JwksCache()


def _verify_token(token: str, settings: Settings) -> CurrentUser:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token.") from exc

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing key id.")

    cert = _jwks_cache.get(kid)
    if cert is None:
        cert = _jwks_cache.get(kid, force_refresh=True)  # R-05: refresh on unknown kid
    if cert is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unrecognized signing key.")

    project_id = settings.firebase_project_id
    try:
        claims = jwt.decode(
            token,
            cert,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"{_ISSUER_PREFIX}{project_id}",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {exc}") from exc

    uid = claims.get("user_id") or claims.get("sub")
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject.")
    return CurrentUser(uid=uid, email=claims.get("email"))


def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """FastAPI dependency: resolves the authenticated user or raises 401."""
    if not settings.auth_required:
        return CurrentUser(uid="dev-user", email="dev@localhost")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    return _verify_token(token, settings)
