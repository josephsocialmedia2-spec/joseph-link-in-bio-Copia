import unittest
from social_engine.autopilot import select_next

class AutopilotTests(unittest.TestCase):
    def setUp(self):self.q=[{'code':'IMM01'},{'code':'COM01'},{'code':'IMM02'}]
    def test_empty_chooses_first(self):
        code,why=select_next(self.q,[],2);self.assertEqual(code,'IMM01')
    def test_pauses_when_pending_releases_fill_quota(self):
        records=[{'tag_name':'joseph-staging-imm01','assets':[{'id':1}]},{'tag_name':'joseph-staging-com01','assets':[{'id':2}]}]
        code,why=select_next(self.q,records,2);self.assertIsNone(code);self.assertIn('Paused',why)
    def test_cleaned_release_is_tombstone_and_skipped(self):
        records=[{'tag_name':'joseph-staging-imm01','assets':[]},{'tag_name':'joseph-staging-com01','assets':[{'id':2}]}]
        code,why=select_next(self.q,records,2);self.assertEqual(code,'IMM02')

if __name__=='__main__':unittest.main()