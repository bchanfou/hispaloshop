from datetime import datetime, timezone
import json
import logging
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from core.database import db

logger = logging.getLogger(__name__)
router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
APPLICATIONS_FILE = DATA_DIR / "importer_applications.jsonl"


class ImporterApplicationRequest(BaseModel):
    company: str = Field(..., min_length=2, max_length=160)
    cif: str = Field(..., min_length=8, max_length=20)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=30)
    product_types: str = Field(..., min_length=10, max_length=400)
    estimated_monthly_volume: str = Field(..., min_length=2, max_length=80)
    has_online_store: bool
    stock_in_spain: bool
    import_licenses_confirmed: bool
    quality_traceability_commitment: bool

    @field_validator("company", "product_types", "estimated_monthly_volume")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        cleaned = " ".join(value.split()).strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        cleaned = re.sub(r"\s+", " ", value).strip()
        if not re.fullmatch(r"^\+?[0-9 ()-]{7,30}$", cleaned):
            raise ValueError("Invalid phone number")
        return cleaned

    @field_validator("cif")
    @classmethod
    def validate_cif(cls, value: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9]", "", value).upper()
        if len(cleaned) < 8 or len(cleaned) > 15:
            raise ValueError("Invalid CIF/VAT number")
        if not re.fullmatch(r"^[A-Z0-9]+$", cleaned):
            raise ValueError("Invalid CIF/VAT number")
        return cleaned

    @model_validator(mode="after")
    def validate_requirements(self):
        if not self.stock_in_spain:
            raise ValueError("Necesitas stock fisico en Espana. No admitimos dropshipping internacional.")
        if not self.import_licenses_confirmed:
            raise ValueError("Debes confirmar licencias de importacion vigentes.")
        if not self.quality_traceability_commitment:
            raise ValueError("Debes aceptar el compromiso de calidad y trazabilidad.")
        return self


class ImporterApplicationResponse(BaseModel):
    ok: bool
    message: str
    status: str


def _read_existing_applications():
    if not APPLICATIONS_FILE.exists():
        return []

    applications = []
    for line in APPLICATIONS_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            applications.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return applications


@router.post(
    "/register/importador",
    response_model=ImporterApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_importer_application(payload: ImporterApplicationRequest, request: Request):
    """Submit a new importer registration application."""
    normalized_email = payload.email.strip().lower()

    # Check duplicates in DB
    existing_email = await db.importer_applications.find_one({"email": normalized_email})
    if existing_email:
        return ImporterApplicationResponse(
            ok=True,
            message="Ya habiamos recibido esta solicitud. Si sigue pendiente, la revisaremos en 24-48h.",
            status=str(existing_email.get("status", "pending")),
        )
    existing_cif = await db.importer_applications.find_one({"cif": payload.cif})
    if existing_cif:
        return ImporterApplicationResponse(
            ok=True,
            message="Ya existe una solicitud para este CIF. Nuestro equipo la revisara antes de duplicarla.",
            status=str(existing_cif.get("status", "pending")),
        )

    record = {
        "application_id": f"imp_app_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        "company": payload.company,
        "cif": payload.cif,
        "email": normalized_email,
        "phone": payload.phone,
        "product_types": payload.product_types,
        "estimated_monthly_volume": payload.estimated_monthly_volume,
        "has_online_store": payload.has_online_store,
        "stock_in_spain": payload.stock_in_spain,
        "import_licenses_confirmed": payload.import_licenses_confirmed,
        "quality_traceability_commitment": payload.quality_traceability_commitment,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "source_path": str(request.url.path),
    }

    try:
        await db.importer_applications.insert_one(record)
    except Exception as exc:
        logger.warning(f"[IMPORTER_REG] DB insert failed, falling back to file: {exc}")
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            with APPLICATIONS_FILE.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        except OSError:
            raise HTTPException(status_code=500, detail="No se pudo guardar la solicitud del importador.")

    return ImporterApplicationResponse(
        ok=True,
        message="Solicitud recibida. Revisamos calidad documental y operativa en 24-48h.",
        status="pending",
    )
