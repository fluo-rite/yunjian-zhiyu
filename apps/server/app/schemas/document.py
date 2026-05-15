from datetime import datetime
from typing import Literal

from app.schemas.common import CamelModel

DocumentParseStatus = Literal["pending", "processing", "success", "failed"]


class DocumentRead(CamelModel):
    id: str
    filename: str
    mime_type: str
    parse_status: DocumentParseStatus
    created_at: datetime
    updated_at: datetime
