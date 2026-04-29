async def _process_transfers():
    # ... some code ...

    # Previous code line causing type mismatch
    # await _notify_admin_transfer_failed(influencer_id, last_error)

    # Fixed line with explanation
    await _notify_admin_transfer_failed(payout.id, last_error)  # Changed to payout.id to match expected UUID type.

    # ... rest of the code ...