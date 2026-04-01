from datetime import datetime, timezone
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from core.database import db

logger = logging.getLogger(__name__)
router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
LEADS_FILE = DATA_DIR / "producer_leads.jsonl"


class ProducerLeadRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=30)
    products: str = Field(..., min_length=2, max_length=160)
    location: str = Field(..., min_length=2, max_length=160)

    @field_validator("name", "phone", "products", "location")
    @classmethod
    def strip_and_validate(cls, value: str) -> str:
        cleaned = " ".join(value.split()).strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned


class ProducerLeadResponse(BaseModel):
    ok: bool
    message: str


def _iter_existing_leads():
    if not LEADS_FILE.exists():
        return []

    leads = []
    for line in LEADS_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            leads.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return leads


@router.post(
    "/register/productor",
    response_model=ProducerLeadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_producer_lead(payload: ProducerLeadRequest, request: Request):
    """Submit a new producer registration lead."""
    normalized_email = payload.email.strip().lower()

    # Check duplicate in DB first
    existing = await db.producer_leads.find_one({"email": normalized_email})
    if existing:
        return ProducerLeadResponse(
            ok=True,
            message="Ya habiamos recibido este contacto. Te escribiremos pronto.",
        )

    record = {
        "name": payload.name,
        "email": normalized_email,
        "phone": payload.phone,
        "products": payload.products,
        "location": payload.location,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "source_path": str(request.url.path),
    }

    try:
        await db.producer_leads.insert_one(record)
    except Exception as exc:
        logger.warning(f"[PRODUCER_REG] DB insert failed, falling back to file: {exc}")
        # Fallback to file-based storage
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            with LEADS_FILE.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        except OSError:
            raise HTTPException(status_code=500, detail="No se pudo guardar el registro del productor.")

    return ProducerLeadResponse(
        ok=True,
        message="Solicitud recibida. Te ayudamos a subir tu catalogo sin coste.",
    )
