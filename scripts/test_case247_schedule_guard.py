"""Offline tests for two daily CASE247 cron phases with Europe/Rome DST."""
import datetime as dt
import unittest
from zoneinfo import ZoneInfo

from case247_schedule_guard import should_reconcile, target_day

TZ = ZoneInfo("Europe/Rome")


class ScheduleGuardTests(unittest.TestCase):
    def test_winter_before_six_skipped(self):
        stamp = dt.datetime(2026, 11, 13, 5, 10, tzinfo=TZ)
        self.assertFalse(should_reconcile(stamp, "schedule", None)[0])

    def test_winter_six_runs_for_today(self):
        stamp = dt.datetime(2026, 11, 13, 6, 10, tzinfo=TZ)
        self.assertEqual(should_reconcile(stamp, "schedule", None),
                         (True, "morning_or_delayed_rebuild", "2026-11-13"))

    def test_delayed_morning_job_is_still_reconciled(self):
        stamp = dt.datetime(2026, 11, 13, 11, 10, tzinfo=TZ)
        self.assertTrue(should_reconcile(stamp, "schedule", None)[0])

    def test_morning_runs_once(self):
        stamp = dt.datetime(2026, 11, 13, 7, 10, tzinfo=TZ)
        existing = {"date": "2026-11-13", "generated_at": "2026-11-13T05:05:00+00:00"}
        self.assertFalse(should_reconcile(stamp, "schedule", existing)[0])

    def test_winter_evening_targets_next_day(self):
        stamp = dt.datetime(2026, 11, 13, 18, 10, tzinfo=TZ)
        self.assertEqual(should_reconcile(stamp, "schedule", None),
                         (True, "evening_or_delayed_rebuild", "2026-11-14"))

    def test_summer_evening_runs_once(self):
        stamp = dt.datetime(2026, 7, 12, 18, 15, tzinfo=TZ)
        existing = {"date": "2026-07-13", "generated_at": "2026-07-12T16:12:00+00:00"}
        self.assertFalse(should_reconcile(stamp.replace(hour=19), "schedule", existing)[0])
        self.assertTrue(should_reconcile(stamp, "schedule", None)[0])

    def test_code_update_and_manual_dispatch(self):
        stamp = dt.datetime(2026, 11, 13, 9, 0, tzinfo=TZ)
        self.assertTrue(should_reconcile(stamp, "push", None)[0])
        self.assertEqual(should_reconcile(stamp, "workflow_dispatch", None)[2],
                         "2026-11-13")

    def test_target_uses_rome_not_host_timezone(self):
        stamp = dt.datetime(2026, 11, 13, 17, 15, tzinfo=dt.timezone.utc)
        self.assertEqual(target_day(stamp), "2026-11-14")


if __name__ == "__main__":
    unittest.main()
