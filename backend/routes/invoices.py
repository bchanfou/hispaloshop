"""
Invoice routes — order invoices and influencer commission summaries.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Query

from core.database import db
from core.auth import get_current_user
from core.models import User
from services.invoice_service import InvoiceService

logger = logging.getLogger(__name__)
router = APIRouter()

_invoice_svc = InvoiceService(db)


@router.get("/invoices/order/{order_id}")
async def get_order_invoice(order_id: str, user: User = Depends(get_current_user)):
    """Return invoice JSON for a customer order."""
    result = await _invoice_svc.generate_order_invoice(order_id, user.user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied")
    return result


@router.get("/invoices/commission")
async def get_commission_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    user: User = Depends(get_current_user),
):
    """Return monthly commission summary JSON for the logged-in influencer."""
    result = await _invoice_svc.generate_commission_summary(user.user_id, month, year)
    if not result:
        raise HTTPException(status_code=404, detail="No commission data found")
    return result
