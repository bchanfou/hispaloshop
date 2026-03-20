"""
Admin A/B Experiments endpoints — Hispaloshop.
POST /admin/experiments — create experiment
GET  /admin/experiments — list active experiments
PUT  /admin/experiments/{test_id}/stop — deactivate experiment
GET  /admin/experiments/{test_id}/stats — exposure stats
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from core.database import get_db
from core.auth import get_current_user, require_role
from core.models import User
from services.ab_testing import ABTestingService

router = APIRouter()


class CreateExperimentRequest(BaseModel):
    test_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field("", max_length=1000)
    variants: Dict[str, int] = Field(..., description="Variant names to weight (must sum to 100)")


@router.post("/admin/experiments", status_code=201)
async def create_experiment(
    body: CreateExperimentRequest,
    user: User = Depends(get_current_user),
):
    await require_role(user, ["admin", "super_admin"])
    db = get_db()
    service = ABTestingService(db)

    # Check for duplicate test_id
    existing = await db.ab_tests.find_one({"test_id": body.test_id})
    if existing:
        raise HTTPException(status_code=409, detail="Experiment with this test_id already exists")

    try:
        result = await service.create_experiment(
            test_id=body.test_id,
            name=body.name,
            description=body.description,
            variants=body.variants,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


@router.get("/admin/experiments")
async def list_experiments(
    active_only: bool = True,
    user: User = Depends(get_current_user),
):
    await require_role(user, ["admin", "super_admin"])
    db = get_db()
    service = ABTestingService(db)
    return await service.list_experiments(active_only=active_only)


@router.put("/admin/experiments/{test_id}/stop")
async def stop_experiment(
    test_id: str,
    user: User = Depends(get_current_user),
):
    await require_role(user, ["admin", "super_admin"])
    db = get_db()
    service = ABTestingService(db)
    result = await service.stop_experiment(test_id)
    if not result:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return result


@router.get("/admin/experiments/{test_id}/stats")
async def experiment_stats(
    test_id: str,
    user: User = Depends(get_current_user),
):
    await require_role(user, ["admin", "super_admin"])
    db = get_db()
    service = ABTestingService(db)
    stats = await service.get_experiment_stats(test_id)
    return {"test_id": test_id, "exposures_by_variant": stats}
