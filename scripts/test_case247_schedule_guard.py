"""Regression tests for delayed GitHub Actions schedules in Italian timezone."""
import datetime as dt
import unittest
from zoneinfo import ZoneInfo

from case247_schedule_guard import should_reconcile

TZ=ZoneInfo("Europe/Rome")

class ScheduleGuardTests(unittest.TestCase):
    def test_winter_before_18_skipped(self):
        day=dt.datetime(2026,11,13,17,10,tzinfo=TZ)
        enabled,why,target=should_reconcile(day,"schedule",None)
        self.assertFalse(enabled)
        self.assertEqual(target,"2026-11-14")

    def test_winter_cron_delayed_still_reconciles(self):
        day=dt.datetime(2026,11,13,22,10,tzinfo=TZ)
        self.assertTrue(should_reconcile(day,"schedule",None)[0])

    def test_summer_18_runs_once(self):
        day=dt.datetime(2026,7,12,18,15,tzinfo=TZ)
        self.assertTrue(should_reconcile(day,"schedule",None)[0])
        existing={"date":"2026-07-13","generated_at":"2026-07-12T16:12:00+00:00"}
        self.assertFalse(should_reconcile(day.replace(hour=19),"schedule",existing)[0])

    def test_old_plan_is_rebuilt(self):
        day=dt.datetime(2026,11,13,19,0,tzinfo=TZ)
        stale={"date":"2026-11-14","generated_at":"2026-11-12T17:00:00+00:00"}
        self.assertTrue(should_reconcile(day,"schedule",stale)[0])

    def test_manual_dispatch_not_blocked(self):
        day=dt.datetime(2026,11,13,9,0,tzinfo=TZ)
        self.assertTrue(should_reconcile(day,"workflow_dispatch",None)[0])

if __name__=="__main__":
    unittest.main()
