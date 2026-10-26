import unittest
import tempfile
from pathlib import Path
from test_engine import csv_fixture, ChatGPTFixtureGenerator
from social_engine.core import plan,generate_campaign,record_receipt
from social_engine.github_release import stage_to_github,remove_staged


class MemoryReleaseClient:
    def __init__(self):self.uploads={};self.removed=[];self.released=False
    def create_or_get_release(self,campaign):return {'id':14,'html_url':'https://github.com/example/releases/tag/staging','upload_url':'https://uploads.github.com/example/assets{?name}'}
    def upload(self,release,path):
        aid=len(self.uploads)+1;self.uploads[path.name]=aid
        return {'id':aid,'browser_download_url':f'https://github.com/example/file/{aid}'}
    def remove(self,id):self.removed.append(id)
    def remove_release(self,id):self.released=True

class StagingTests(unittest.TestCase):
    def test_upload_idempotent_remove_gated(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);csvs=csv_fixture(root)
            plan(root,list(csvs),'2026-11-01T08:00:00+01:00')
            photo=Path(__file__).parent.parent/'fixtures'/'joseph_reference_sample.jpg'
            generate_campaign(root,'COM01',photo,ChatGPTFixtureGenerator(photo))
            github=MemoryReleaseClient()
            a=stage_to_github(root,'COM01',github)
            self.assertEqual(len(a['files']),7)
            stage_to_github(root,'COM01',github)
            self.assertEqual(len(github.uploads),7)
            with self.assertRaises(PermissionError):remove_staged(root,'COM01',github)
            for ch in ['facebook','instagram','linkedin']:
                record_receipt(root,'COM01',ch,'receipt-'+ch+'-1234','scheduled')
            out=remove_staged(root,'COM01',github)
            self.assertEqual(out['deleted'],7)
            self.assertEqual(len(github.removed),7)
            self.assertTrue(github.released)

if __name__=='__main__':unittest.main()