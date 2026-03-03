from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from routers.realtime_chat import ChatConnectionManager


def test_rate_limit_blocks_after_30_messages_per_minute():
    manager = ChatConnectionManager()
    user_id = "u-1"

    for _ in range(30):
        assert manager._is_rate_limited(user_id) is False

    assert manager._is_rate_limited(user_id) is True


def test_rate_limit_window_resets_after_one_minute():
    manager = ChatConnectionManager()
    user_id = "u-2"

    now = datetime.now(timezone.utc)
    manager.rate_windows[user_id].extend([now - timedelta(minutes=2)] * 30)

    assert manager._is_rate_limited(user_id) is False
