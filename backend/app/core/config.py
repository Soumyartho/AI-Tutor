"""Application configuration, loaded from environment / .env.

All @GUARD safety limits (R-01, R-04) are surfaced here as tunable settings so
they can be adjusted per-deployment without code changes.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Firebase
    firebase_project_id: str = ""
    google_application_credentials: str = ""

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # CORS
    cors_origins: str = "http://localhost:5173"

    # R-01 symbolic-engine guards
    solve_timeout_seconds: float = 3.0
    max_expression_length: int = 200
    max_ast_nodes: int = 200

    # R-04 tracer guards
    max_trace_depth: int = 25
    max_trace_nodes: int = 500

    # Auth toggle (see auth module)
    auth_required: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def persistence_enabled(self) -> bool:
        return bool(self.google_application_credentials)

    @property
    def explain_enabled(self) -> bool:
        return bool(self.groq_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
