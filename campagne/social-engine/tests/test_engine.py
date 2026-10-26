from pathlib import Path
from datetime import datetime
import csv
import tempfile
import unittest
from PIL import Image
from social_engine.core import (load_posts,build_calendar,plan, generate_campaign, record_receipt, cleanup, sha256, audit, prompt_for, OpenAIOnlyGenerator)


class ChatGPTFixtureGenerator:
    """Test double only; copies EXISTING ChatGPT-created PNG, doesn't generate art."""
    def __init__(self, sample): self.sample=sample;self.calls=0
    def generate(self,prompt,output,reference,previous=None):
        self.calls+=1
        output.write_bytes(self.sample.read_bytes())


def csv_fixture(where):
    a=where/'imm.csv';b=where/'com.csv'
    headings=['Codice','Angolo comunicativo','Social network','Testo proposto','Stato','URL landing']
    for path,prefix,n in [(a,'IMM',21),(b,'COM',18)]:
        with path.open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.writer(f);w.writerow(headings)
            for j in range(1,n+1):
                for channel in ['facebook','instagram','linkedin']:
                    w.writerow([f'{prefix}{j:02d}',f'Tema campagna {prefix}{j:02d}',channel,'Questo contenuto descrive un servizio e invita a esplorare la landing appropriata.','BOZZA',f'https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/campagne/immobiliare/valore-casa/'])
    return a,b


class EngineTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); self.files=csv_fixture(self.root)
        self.sample=Path(__file__).resolve().parent.parent/'fixtures'/'joseph_reference_sample.jpg'
        self.start='2026-11-01T08:00:00+01:00'

    def test_csv_counts_and_timetable(self):
        posts=load_posts(list(self.files));self.assertEqual(len(posts),117)
        events=build_calendar(posts,self.start)
        self.assertEqual(events[0]['id'],'IMM01_facebook')
        self.assertEqual(events[3]['id'],'COM01_facebook')
        self.assertEqual((datetime.fromisoformat(events[1]['scheduled_for'])-datetime.fromisoformat(events[0]['scheduled_for'])).total_seconds(),21600)
        self.assertEqual(len(events),117)
        self.assertEqual(len(set(e['id'] for e in events)),117)
        self.assertEqual(events[-1]['scheduled_for'],'2026-11-30T08:00+01:00')

    def test_validation_duplicate_and_no_unverified_url(self):
        p=self.files[0];p.write_text(p.read_text(encoding='utf-8-sig').replace('josephsocialmedia2-spec.github.io','invalid.example'),encoding='utf8')
        with self.assertRaises(ValueError): load_posts(list(self.files))

    def test_generation_resume_receipts_and_cleanup(self):
        plan(self.root,list(self.files),self.start)
        generator=ChatGPTFixtureGenerator(self.sample)
        m=generate_campaign(self.root,'IMM01',self.sample,generator)
        self.assertEqual(generator.calls,7)
        self.assertEqual(m['status'],'ready_for_later_import')
        self.assertEqual(len(m['assets']),7)
        m=generate_campaign(self.root,'IMM01',self.sample,generator)
        self.assertEqual(generator.calls,7,'regeneration must be idempotent')
        with self.assertRaises(PermissionError):cleanup(self.root,'IMM01')
        record_receipt(self.root,'IMM01','facebook','later-post-123','media_imported')
        record_receipt(self.root,'IMM01','instagram','later-post-124','media_imported')
        with self.assertRaises(PermissionError):cleanup(self.root,'IMM01')
        record_receipt(self.root,'IMM01','linkedin','later-post-125','media_imported')
        answer=cleanup(self.root,'IMM01');self.assertEqual(answer['deleted'],7)
        self.assertTrue((self.root/'archive'/'IMM01.json').exists())
        self.assertTrue((self.root/'outbox'/'IMM01'/'caption_facebook.txt').exists())
        self.assertTrue(self.sample.exists(),'original photo must never be deleted')
        self.assertEqual(audit(self.root)['campaign_status']['IMM01'],'cleaned')

    def test_checks_missing_api_key_model_and_missing_reference(self):
        import os
        old=os.environ.pop('OPENAI_API_KEY',None)
        try:
            with self.assertRaises(RuntimeError): OpenAIOnlyGenerator()
            with self.assertRaises(ValueError): OpenAIOnlyGenerator('other-image-engine')
        finally:
            if old:os.environ['OPENAI_API_KEY']=old
        plan(self.root,list(self.files),self.start)
        with self.assertRaises(FileNotFoundError): generate_campaign(self.root,'IMM01',Path('missing.jpg'),ChatGPTFixtureGenerator(self.sample))

    def test_detect_corruption_blocks_cleanup(self):
        plan(self.root,list(self.files),self.start)
        generate_campaign(self.root,'IMM01',self.sample,ChatGPTFixtureGenerator(self.sample))
        for ch in ['facebook','instagram','linkedin']:
            record_receipt(self.root,'IMM01',ch,f'later-post-{ch}-00001','scheduled')
        (self.root/'outbox'/'IMM01'/'static.png').write_bytes(b'changed')
        with self.assertRaises(ValueError):cleanup(self.root,'IMM01')

    def test_brand_and_restrictions(self):
        item={'code':'IMM01','title':'Quanto vale la casa','copy':'Dati sulla casa e il territorio.'}
        p=prompt_for(item,'carousel',5)
        self.assertIn('EXACT face identity',p)
        self.assertIn('METODO REMARKETING',p)
        self.assertIn('no SVG substitutes',p)
        self.assertIn('WhatsApp',p)

if __name__=='__main__':unittest.main()