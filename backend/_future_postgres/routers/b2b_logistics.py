from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import B2BDocument, B2BEscrow, ForwarderPartner, Importer, Shipment, ShipmentOrder, ShippingRoute, User
from routers.auth import get_current_user
from schemas import (
    B2BDocumentResponse,
    DocumentGenerateRequest,
    DocumentSignRequest,
    EscrowCreateRequest,
    EscrowDisputeRequest,
    EscrowFundRequest,
    EscrowResponse,
    ForwarderResponse,
    ShipmentCreateRequest,
    ShipmentDocumentUpdateRequest,
    ShipmentEventCreateRequest,
    ShipmentResponse,
    ShippingQuoteRequest,
    ShippingQuoteResponse,
)
from services.logistics import calculate_shipping_quote, make_shipment_number

router = APIRouter(prefix="/b2b", tags=["b2b_logistics"])


async def _next_shipment_number(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count()).select_from(Shipment))
    return make_shipment_number((count or 0) + 1)


@router.post("/shipments/quote", response_model=ShippingQuoteResponse)
async def quote_shipment(payload: ShippingQuoteRequest, db: AsyncSession = Depends(get_db)):
    query = select(ShippingRoute).where(
        ShippingRoute.origin_country == payload.origin_country.upper(),
        ShippingRoute.destination_country == payload.destination_country.upper(),
    )
    route = await db.scalar(query)
    if not route:
        raise HTTPException(status_code=404, detail="No active route found")
    if payload.mode and payload.mode not in route.modes_available:
        raise HTTPException(status_code=400, detail="Requested mode unavailable for this route")

    return calculate_shipping_quote(
        base_cost_per_kg=route.base_cost_per_kg,
        fuel_surcharge_percent=route.fuel_surcharge_percent,
        transit_time_days=route.transit_time_days,
        cargo=payload.cargo.model_dump(),
    )


@router.post("/shipments", response_model=ShipmentResponse)
async def create_shipment(
    payload: ShipmentCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role not in {"importer", "producer", "admin"}:
        raise HTTPException(status_code=403, detail="Role not authorized")

    importer = await db.get(Importer, payload.importer_id)
    if not importer:
        raise HTTPException(status_code=404, detail="Importer not found")

    route = await db.get(ShippingRoute, payload.route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    if payload.type == "air" and "air" not in route.modes_available:
        raise HTTPException(status_code=400, detail="Air mode not available on route")

    shipment = Shipment(
        shipment_number=await _next_shipment_number(db),
        type=payload.type,
        importer_id=payload.importer_id,
        exporter_id=payload.exporter_id,
        route_id=payload.route_id,
        carrier_id=payload.carrier_id,
        service_level=payload.service_level,
        status="booked",
        containers=payload.containers,
        incoterm=payload.incoterm,
        payment_term=payload.payment_term,
        estimated_departure=payload.estimated_departure,
        estimated_arrival=payload.estimated_arrival,
        tracking_events=[
            {
                "status": "booked",
                "location": route.origin_country,
                "description": "Shipment booked",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
    )
    db.add(shipment)
    await db.flush()

    for order_id in payload.related_order_ids:
        db.add(ShipmentOrder(shipment_id=shipment.id, order_id=order_id, consolidation_fee_applied=0))

    await db.flush()
    return shipment


@router.get("/shipments/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment(shipment_id: UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment


@router.get("/shipments/{shipment_id}/tracking")
async def get_shipment_tracking(shipment_id: UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return {"shipment_id": shipment_id, "status": shipment.status, "events": shipment.tracking_events}


@router.put("/shipments/{shipment_id}/documents", response_model=ShipmentResponse)
async def update_shipment_documents(
    shipment_id: UUID,
    payload: ShipmentDocumentUpdateRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    shipment.documents = {**(shipment.documents or {}), **payload.documents}
    await db.flush()
    return shipment


@router.post("/shipments/{shipment_id}/events", response_model=ShipmentResponse)
async def append_tracking_event(
    shipment_id: UUID,
    payload: ShipmentEventCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    shipment = await db.get(Shipment, shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    events = list(shipment.tracking_events or [])
    events.append(
        {
            "status": payload.status,
            "location": payload.location,
            "description": payload.description,
            "occurred_at": (payload.occurred_at or datetime.now(timezone.utc)).isoformat(),
        }
    )
    shipment.tracking_events = events
    shipment.status = payload.status
    if payload.status == "delivered":
        shipment.actual_arrival = payload.occurred_at or datetime.now(timezone.utc)
    await db.flush()
    return shipment


@router.post("/escrow", response_model=EscrowResponse)
async def create_escrow(payload: EscrowCreateRequest, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await db.get(Importer, payload.importer_id):
        raise HTTPException(status_code=404, detail="Importer not found")

    escrow = B2BEscrow(
        importer_id=payload.importer_id,
        exporter_id=payload.exporter_id,
        shipment_id=payload.shipment_id,
        amount_cents=payload.amount_cents,
        currency=payload.currency,
        provider=payload.provider,
        status="PENDING_FUNDS",
        timeline_events=[{"status": "PENDING_FUNDS", "occurred_at": datetime.now(timezone.utc).isoformat()}],
    )
    db.add(escrow)
    await db.flush()
    return escrow


@router.get("/escrow/{escrow_id}", response_model=EscrowResponse)
async def get_escrow(escrow_id: UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    escrow = await db.get(B2BEscrow, escrow_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")
    return escrow


@router.post("/escrow/{escrow_id}/fund", response_model=EscrowResponse)
async def fund_escrow(
    escrow_id: UUID,
    payload: EscrowFundRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    escrow = await db.get(B2BEscrow, escrow_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")

    escrow.status = "FUNDS_HELD"
    escrow.provider_reference = payload.provider_reference
    escrow.timeline_events = [
        *(escrow.timeline_events or []),
        {"status": "FUNDS_HELD", "occurred_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.flush()
    return escrow


@router.post("/escrow/{escrow_id}/release", response_model=EscrowResponse)
async def release_escrow(escrow_id: UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    escrow = await db.get(B2BEscrow, escrow_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")

    if escrow.status not in {"ARRIVED", "INSPECTION", "IN_TRANSIT", "FUNDS_HELD", "SHIPPED"}:
        raise HTTPException(status_code=400, detail="Escrow not releasable in current state")

    escrow.status = "COMPLETED"
    escrow.released_at = datetime.now(timezone.utc)
    escrow.timeline_events = [
        *(escrow.timeline_events or []),
        {"status": "COMPLETED", "occurred_at": escrow.released_at.isoformat()},
    ]
    await db.flush()
    return escrow


@router.post("/escrow/{escrow_id}/dispute", response_model=EscrowResponse)
async def dispute_escrow(
    escrow_id: UUID,
    payload: EscrowDisputeRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    escrow = await db.get(B2BEscrow, escrow_id)
    if not escrow:
        raise HTTPException(status_code=404, detail="Escrow not found")

    escrow.status = "DISPUTED"
    escrow.timeline_events = [
        *(escrow.timeline_events or []),
        {"status": "DISPUTED", "reason": payload.reason, "occurred_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.flush()
    return escrow


@router.post("/documents/generate", response_model=list[B2BDocumentResponse])
async def generate_documents(
    payload: DocumentGenerateRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    shipment = await db.get(Shipment, payload.shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    generated: list[B2BDocument] = []
    for doc_type in payload.document_types:
        content = {
            "shipment_number": shipment.shipment_number,
            "incoterm": shipment.incoterm,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "lines": shipment.containers,
        }
        doc = B2BDocument(
            shipment_id=shipment.id,
            document_type=doc_type,
            status="generated",
            file_url=f"/api/v1/b2b/documents/{doc_type}/{shipment.shipment_number}.pdf",
            content=content,
        )
        db.add(doc)
        generated.append(doc)

    await db.flush()
    return generated


@router.get("/documents/{document_id}/download", response_model=B2BDocumentResponse)
async def download_document(document_id: UUID, _: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    document = await db.get(B2BDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("/documents/{document_id}/sign", response_model=B2BDocumentResponse)
async def sign_document(
    document_id: UUID,
    payload: DocumentSignRequest,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    document = await db.get(B2BDocument, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.status = "signed"
    document.signed_at = datetime.now(timezone.utc)
    document.content = {**(document.content or {}), "signed_by": payload.signer_name}
    await db.flush()
    return document


@router.get("/forwarders", response_model=list[ForwarderResponse])
async def list_forwarders(
    country: str | None = None,
    service: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ForwarderPartner).where(ForwarderPartner.active.is_(True))
    partners = list((await db.scalars(query)).all())

    if country:
        country_upper = country.upper()
        partners = [p for p in partners if country_upper in (p.countries_covered or [])]
    if service:
        partners = [p for p in partners if service in (p.services or [])]
    return partners


@router.get("/forwarders/{forwarder_id}/rates")
async def forwarder_rates(
    forwarder_id: UUID,
    origin_country: str,
    destination_country: str,
    db: AsyncSession = Depends(get_db),
):
    forwarder = await db.get(ForwarderPartner, forwarder_id)
    if not forwarder or not forwarder.active:
        raise HTTPException(status_code=404, detail="Forwarder not found")

    route = await db.scalar(
        select(ShippingRoute).where(
            ShippingRoute.origin_country == origin_country.upper(),
            ShippingRoute.destination_country == destination_country.upper(),
        )
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    adjustment = max(0.8, 1.15 - (forwarder.rating / 10))
    return {
        "forwarder_id": forwarder.id,
        "company_name": forwarder.company_name,
        "origin_country": origin_country.upper(),
        "destination_country": destination_country.upper(),
        "estimated_base_cost_per_kg": round(route.base_cost_per_kg * adjustment, 2),
        "transit_time_days": route.transit_time_days,
        "service_levels": ["economy", "standard", "express"],
    }
