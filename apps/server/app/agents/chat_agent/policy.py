from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field


class WebSearchDecision(BaseModel):
    should_search_web: bool = Field(
        validation_alias=AliasChoices("should_search_web", "is_search_needed")
    )
