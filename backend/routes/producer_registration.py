from datetime import datetime, timezone
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator


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
    existing = _iter_existing_leads()
    normalized_email = payload.email.strip().lower()

    for lead in existing:
        if str(lead.get("email", "")).strip().lower() == normalized_email:
            return ProducerLeadResponse(
                ok=True,
                message="Ya habiamos recibido este contacto. Te escribiremos pronto.",
            )

    DATA_DIR.mkdir(parents=True, exist_ok=True)

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
        with LEADS_FILE.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar el registro del productor.",
        ) from exc

    return ProducerLeadResponse(
        ok=True,
        message="Solicitud recibida. Te ayudamos a subir tu catalogo sin coste.",
    )
