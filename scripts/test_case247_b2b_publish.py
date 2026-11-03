import os,unittest,datetime as dt,copy
os.environ.setdefault('GITHUB_REPOSITORY','test/repo')
os.environ.setdefault('GH_TOKEN','test-only')
from case247_b2b_publish import eligible
class Safety(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,3,19,10,tzinfo=dt.timezone.utc)
  self.j={'id':'x-facebook','content_id':'x','platform':'facebook','approved':True,'audience':'aziende','scheduled_at_local':'2026-11-03T20:00:00+01:00'}
 def select(self,j=None,records=None,mode='due',cid=''):
  return eligible({'jobs':[j or self.j]},records or {},self.now,mode,cid)
 def test_due(self):self.assertEqual(len(self.select()),1)
 def test_uncertain_attempt_blocks_retry(self):self.assertEqual(self.select(records={'x-facebook':{'status':'ATTEMPTED_VERIFY_BEFORE_RETRY'}}),[])
 def test_content_platform_duplicate(self):
  other=dict(self.j,id='other')
  with self.assertRaises(RuntimeError):eligible({'jobs':[self.j,other]}, {}, self.now)
 def test_old_not_backfilled(self):self.assertEqual(self.select(dict(self.j,scheduled_at_local='2026-11-02T20:00:00+01:00')),[])
 def test_future_not_due(self):self.assertEqual(self.select(dict(self.j,scheduled_at_local='2026-11-04T20:00:00+01:00')),[])
 def test_explicit_now_requires_id(self):
  self.assertEqual(self.select(mode='next'),[])
  self.assertEqual(len(self.select(mode='next',cid='x')),1)
 def test_unapproved_excluded(self):self.assertEqual(self.select(dict(self.j,approved=False)),[])
 def test_privati_excluded(self):self.assertEqual(self.select(dict(self.j,audience='privati')),[])
 def test_existing_meta_id_blocks(self):self.assertEqual(self.select(dict(self.j,external_post_id='123')),[])
 def test_summer_offset(self):
  with self.assertRaises(RuntimeError):self.select(dict(self.j,scheduled_at_local='2026-07-03T20:00:00+01:00'))
if __name__=='__main__':unittest.main()
