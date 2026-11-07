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
 def test_changed_job_id_still_blocked(self):
  self.assertEqual(self.select(records={"old":{"content_id":"x","platform":"facebook"}}),[])
 def test_stale_manual_blocked(self):
  self.assertEqual(self.select(dict(self.j,scheduled_at_local="2026-11-02T20:00:00+01:00"),mode="next",cid="x"),[])
 def test_old_not_backfilled(self):self.assertEqual(self.select(dict(self.j,scheduled_at_local='2026-11-02T20:00:00+01:00')),[])
 def test_future_not_due(self):self.assertEqual(self.select(dict(self.j,scheduled_at_local='2026-11-04T20:00:00+01:00')),[])
 def test_recovery_explicit_only(self):
  old=dict(self.j,scheduled_at_local="2026-11-03T20:00:00+01:00",id="CASE247-009-facebook",content_id="CASE247-009")
  self.now=dt.datetime(2026,11,6,9,40,tzinfo=dt.timezone.utc)
  self.assertEqual(len(self.select(old,mode="recover",cid="CASE247-009")),1)
  self.assertEqual(self.select(old,mode="recover",cid="CASE247-012"),[])
  self.assertEqual(self.select(old,mode="recover",cid=""),[])
 def test_recovery_rejects_unapproved_ids(self):
  self.now=dt.datetime(2026,11,6,9,40,tzinfo=dt.timezone.utc)
  self.assertEqual(self.select(mode="recover",cid="x"),[])
 def test_recovery_rejects_prior_post(self):
  self.now=dt.datetime(2026,11,6,9,40,tzinfo=dt.timezone.utc)
  old=dict(self.j,id="CASE247-009-facebook",content_id="CASE247-009")
  self.assertEqual(self.select(old,records={"CASE247-009-facebook":{"status":"PUBLISHED"}},mode="recover",cid="CASE247-009"),[])
 def test_explicit_now_requires_id(self):
  self.assertEqual(self.select(mode='next'),[])
  self.assertEqual(len(self.select(mode='next',cid='x')),1)
 def test_unapproved_excluded(self):self.assertEqual(self.select(dict(self.j,approved=False)),[])
 def test_privati_supported(self):self.assertEqual(len(self.select(dict(self.j,audience='privati'))),1)
 def test_existing_meta_id_blocks(self):self.assertEqual(self.select(dict(self.j,external_post_id='123')),[])
 def test_summer_offset(self):
  with self.assertRaises(RuntimeError):self.select(dict(self.j,scheduled_at_local='2026-07-03T20:00:00+01:00'))
class RemoteSafety(unittest.TestCase):
 def setUp(self):
  self.job={"platform":"instagram","caption":"Test caption"}
 def test_match_blocks_republication(self):
  from unittest.mock import patch
  from case247_b2b_publish import remote_matches
  with patch('case247_b2b_publish.meta',return_value={"data":[{"id":"existing","caption":"Test  caption","permalink":"https://www.instagram.com/p/existing/"}]}):
   self.assertEqual(remote_matches(self.job,"123")[0]["external_post_id"],"existing")
 def test_cursor_does_not_replay_token_url(self):
  from unittest.mock import patch
  from case247_b2b_publish import remote_matches
  with patch('case247_b2b_publish.meta',side_effect=[{"data":[],"paging":{"next":"https://untrusted.invalid/?access_token=SECRET","cursors":{"after":"abc"}}},{"data":[]}]) as api:
   self.assertEqual(remote_matches(self.job,"123"),[])
   self.assertIn('after=abc',api.call_args.args[0]);self.assertNotIn('SECRET',api.call_args.args[0])
 def test_incomplete_history_blocks(self):
  from unittest.mock import patch
  from case247_b2b_publish import remote_matches
  with patch('case247_b2b_publish.meta',return_value={"data":[],"paging":{"next":"somewhere"}}):
   with self.assertRaises(RuntimeError):remote_matches(self.job,"123")
 def test_network_failure_blocks(self):
  from unittest.mock import patch
  from case247_b2b_publish import remote_matches
  with patch('case247_b2b_publish.meta',side_effect=RuntimeError('NETWORK_ERROR')):
   with self.assertRaises(RuntimeError):remote_matches(self.job,"123")
 def test_unknown_mode_blocked(self):
  with self.assertRaises(RuntimeError):eligible({"jobs":[]},{},dt.datetime.now(dt.timezone.utc),'typo')
 def test_future_calendar_is_unapproved(self):
  import json
  from pathlib import Path
  q=json.loads(Path('campagne/case247/editorial-queue/2026-11-07_2026-12-06/queue.json').read_text())
  self.assertEqual(len(q['jobs']),120)
  self.assertEqual(eligible(q,{},dt.datetime(2026,11,7,19,tzinfo=dt.timezone.utc)),[])
class FailureRecovery(unittest.TestCase):
 def test_uncertain_post_never_sent_twice(self):
  import case247_b2b_publish as pub
  from unittest.mock import patch
  from pathlib import Path
  import tempfile
  job={"id":"CASE247-009-facebook","content_id":"CASE247-009","platform":"facebook","audience":"aziende","approved":True,"scheduled_at_local":"2026-11-03T20:00:00+01:00","caption":"approved text","media_jpeg":"campagne/case247/editorial-queue/test/a.jpg"}
  ledger={"records":{}};posts=[]
  def read(path):return copy.deepcopy(ledger) if path==pub.L else {},'sha'
  def write(path,data,sha):
   if path==pub.L:ledger.update(copy.deepcopy(data))
   return 'next-sha'
  def meta(path,body=None):
   if body is not None:posts.append(path);raise RuntimeError('NETWORK_ERROR_AFTER_POST')
   if path.startswith('me?'):return {"id":"page"}
   if path.startswith('page?'):return {"id":"page","instagram_business_account":{"id":"ig"}}
   return {"id":"ig","username":"test"}
  env={"META_PAGE_ACCESS_TOKEN":"test-only","META_FACEBOOK_PAGE_ID":"page","META_INSTAGRAM_USER_ID":"ig","PUBLISH_MODE":"recover","CONTENT_ID":"CASE247-009","GITHUB_EVENT_NAME":"workflow_dispatch","DRY_RUN":"false"}
  with patch.dict(os.environ,env),patch.object(pub,'load_queues',return_value={"jobs":[job]}),patch.object(pub,'read',side_effect=read),patch.object(pub,'write',side_effect=write),patch.object(pub,'meta',side_effect=meta),patch.object(pub,'verify_image',return_value='https://example.test/a.jpg'),patch.object(pub,'remote_matches',return_value=[]),patch.object(pub,'save_status'),patch('builtins.print'):
   with self.assertRaises(RuntimeError):pub.main()
   self.assertEqual(ledger['records'][job['id']]['status'],'ATTEMPTED_VERIFY_BEFORE_RETRY')
   with self.assertRaises(RuntimeError):pub.main()
  self.assertEqual(len(posts),1)
 def test_known_id_reconciled_without_post(self):
  import case247_b2b_publish as pub
  from unittest.mock import patch
  job={"id":"job","platform":"instagram"};records={"job":{"status":"PUBLISHED_UNVERIFIED","external_post_id":"123","target_id":"ig"}}
  with patch.dict(os.environ,{"META_INSTAGRAM_USER_ID":"ig"}),patch.object(pub,'remote_matches',return_value=[{"external_post_id":"123","permalink":"https://www.instagram.com/p/test/"}]),patch.object(pub,'write',return_value='new'),patch.object(pub,'meta') as api:
   self.assertEqual(pub.reconcile_known_posts([job],records,'old'),'new')
   self.assertEqual(records['job']['status'],'PUBLISHED');api.assert_not_called()
if __name__=='__main__':unittest.main()

