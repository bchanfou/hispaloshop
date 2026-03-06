from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from services.subscriptions import check_influencer_attribution


class _Collection:
    def __init__(self, doc):
        self._doc = doc

    async def find_one(self, *args, **kwargs):
        return self._doc


class _DB:
    def __init__(self, existing, discount):
        self.customer_influencer_attribution = _Collection(existing)
        self.discount_codes = _Collection(discount)


@pytest.mark.asyncio
async def test_check_influencer_attribution_ignores_invalid_expiry_format():
    db = _DB(
        existing={
            "customer_id": "c1",
            "is_active": True,
            "influencer_id": "inf-old",
            "code_used": "OLDCODE",
            "attribution_expiry_date": "not-a-date",
        },
        discount={"influencer_id": "inf-new", "code": "NEWCODE"},
    )

    result = await check_influencer_attribution(db, customer_id="c1", influencer_code="newcode")

    assert result["allowed"] is True
    assert result["influencer_id"] == "inf-new"
    assert result["existing"] is False
