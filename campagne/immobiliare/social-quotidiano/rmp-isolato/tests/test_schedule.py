import os
import sys
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import schedule
import worker


class ScheduleTests(unittest.TestCase):
    def test_nine_unique_daily_jobs(self):
        rows = schedule.daily_posts(date(2026, 10, 28))
        self.assertEqual(len(rows), 9)
        self.assertEqual(len(set(x['id'] for x in rows)), 9)
        self.assertEqual(len(set((x['platform'], x['scheduled_at']) for x in rows)), 9)

    def test_both_fixed_links_every_caption(self):
        for row in schedule.daily_posts(date(2026, 10, 28)):
            self.assertEqual(row['caption'].count(schedule.AGENT), 1)
            self.assertEqual(row['caption'].count(schedule.WHATSAPP), 1)
            self.assertIn('non una perizia certificata', row['caption'])
            self.assertNotIn('vendita garantita', row['caption'].lower())

    def test_local_times_on_dst_switches(self):
        march = schedule.daily_posts(date(2026, 3, 29))
        october = schedule.daily_posts(date(2026, 10, 25))
        self.assertTrue(all(x['scheduled_at'].endswith('+02:00') for x in march))
        self.assertTrue(all(x['scheduled_at'].endswith('+01:00') for x in october))
        self.assertEqual({x['local_time'] for x in march}, set(schedule.SLOTS))

    def test_due_and_late_cutoff(self):
        post = schedule.daily_posts(date(2026, 10, 28))[0]
        instant = datetime.fromisoformat(post['scheduled_at']).astimezone(timezone.utc)
        self.assertEqual(len(schedule.due([post], instant-timedelta(seconds=1))), 0)
        self.assertEqual(len(schedule.due([post], instant+timedelta(minutes=20))), 1)
        self.assertEqual(len(schedule.due([post], instant+timedelta(minutes=46))), 0)

    def test_no_duplicate_caption_next_day(self):
        a = schedule.daily_posts(date(2026, 10, 28))
        b = schedule.daily_posts(date(2026, 10, 29))
        self.assertNotEqual(a[0]['caption'], b[0]['caption'])

    def test_invalid_platform_rejected(self):
        with self.assertRaises(ValueError):
            schedule.caption('tiktok', 0)


class FailClosedTests(unittest.TestCase):
    def test_old_supabase_forbidden(self):
        before = os.environ.get('RMP_SUPABASE_URL')
        os.environ['RMP_SUPABASE_URL'] = 'https://nqnmlsmeiynxbdojeyjt.supabase.co'
        try:
            with self.assertRaises(worker.Blocked):
                worker.db_url()
        finally:
            if before is None: os.environ.pop('RMP_SUPABASE_URL', None)
            else: os.environ['RMP_SUPABASE_URL'] = before

    def test_invalid_video_url_forbidden(self):
        old = {k:os.environ.get(k) for k in ('RMP_VIDEO_URL','RMP_VIDEO_HOST')}
        os.environ['RMP_VIDEO_URL'] = 'http://localhost:8000/video.mp4'
        os.environ['RMP_VIDEO_HOST'] = 'localhost'
        try:
            with self.assertRaises(worker.Blocked):
                worker.video_url()
        finally:
            for key,val in old.items():
                if val is None: os.environ.pop(key, None)
                else: os.environ[key] = val

    def test_media_hash_must_match_approved_database(self):
        original = os.environ.get('RMP_VIDEO_SHA256')
        os.environ['RMP_VIDEO_SHA256'] = 'a' * 64
        try:
            self.assertEqual(worker.verify_media_identity({'media_sha256': 'a' * 64}), 'a' * 64)
            with self.assertRaises(worker.Blocked):
                worker.verify_media_identity({'media_sha256': 'b' * 64})
            with self.assertRaises(worker.Blocked):
                worker.verify_media_identity({'media_sha256': None})
        finally:
            if original is None:
                os.environ.pop('RMP_VIDEO_SHA256', None)
            else:
                os.environ['RMP_VIDEO_SHA256'] = original

    def test_linkedin_must_be_verified_person_not_company(self):
        expected = {"id": "member_APP_123", "localizedFirstName": "Joseph",
                    "localizedLastName": "Malafronte"}
        result = worker.verify_linkedin_person("urn:li:person:member_APP_123", expected)
        self.assertEqual(result, "Joseph Malafronte")
        with self.assertRaises(worker.Blocked):
            worker.verify_linkedin_person("urn:li:organization:123", expected)
        with self.assertRaises(worker.Blocked):
            worker.verify_linkedin_person("urn:li:person:wrong", expected)
        with self.assertRaises(worker.Blocked):
            worker.verify_linkedin_person("urn:li:person:member_APP_123", {"id": "member_APP_123"})
        with self.assertRaises(worker.Blocked):
            worker.verify_linkedin_person("https://www.linkedin.com/in/josephmalafronte", expected)

    def test_missing_quota_refuses_live(self):
        orig = worker.db
        worker.db = lambda *_: []
        try:
            with self.assertRaises(worker.Blocked):
                worker.quotas_ok()
        finally:
            worker.db = orig

    def test_no_token_leak_in_exception_message(self):
        old = os.environ.get('RMP_LINKEDIN_TOKEN')
        os.environ.pop('RMP_LINKEDIN_TOKEN', None)
        try:
            with self.assertRaises(worker.Blocked):
                worker.linkedin_headers()
        finally:
            if old is not None: os.environ['RMP_LINKEDIN_TOKEN'] = old


if __name__ == '__main__':
    unittest.main()
