from __future__ import annotations

import os
import time
from datetime import date, datetime
from zoneinfo import ZoneInfo


APP_TIMEZONE_NAME = os.environ.get("FERSHOP_TIMEZONE", "America/Bogota").strip() or "America/Bogota"
APP_TIMEZONE = ZoneInfo(APP_TIMEZONE_NAME)


def configure_process_timezone() -> str:
    os.environ["TZ"] = APP_TIMEZONE_NAME
    if hasattr(time, "tzset"):
        time.tzset()
    return APP_TIMEZONE_NAME


def get_app_timezone_name() -> str:
    return APP_TIMEZONE_NAME


def now_local() -> datetime:
    return datetime.now(APP_TIMEZONE)


def today_local() -> date:
    return now_local().date()


configure_process_timezone()
