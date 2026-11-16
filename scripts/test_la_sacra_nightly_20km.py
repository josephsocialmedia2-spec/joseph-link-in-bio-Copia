import csv,datetime as dt,io,json,sys,unittest,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import la_sacra_nightly_20km as m
from decrypt_la_sacra_batch import decrypt

class NightlyChecks(unittest.TestCase):
    def test_radius_boundary(self):
        self.assertLess(m.dist(45.0800,7.3980),0.01)
        self.assertGreater(m.dist(46,7.398),20)
        self.assertEqual(m.quadrant(45.09,7.39),"NW")
    def test_vat_is_not_official_verification(self):
        self.assertTrue(m.vat_ok("07697360019"))
        self.assertFalse(m.vat_ok("07697360018"))
        self.assertFalse(m.vat_ok("nonesiste"))
    def test_overpass_only_business_categories(self):
        query=m.make_query(next(m.tiles()))
        self.assertIn("restaurant|cafe",query)
        self.assertIn('["shop"]',query)
        self.assertNotIn('["amenity"];',query)
        self.assertEqual(len(list(m.tiles())),16)
    def test_do_not_invent_data(self):
        el={"type":"node","id":100,"lat":45.08,"lon":7.4,"tags":{"name":"Negozio A","shop":"yes","phone":"+39 011 1234567"}}
        row=m.from_osm(el,"2026-11-16")
        self.assertEqual(row["vat"],"")
        self.assertEqual(row["email"],"")
        self.assertEqual(row["phone"],"+39 011 1234567")
        self.assertLess(row["distance"],20)
        el["lon"]=9.5
        self.assertIsNone(m.from_osm(el,"2026-11-16"))
    def test_rotation_and_280_limit_and_xlsx(self):
        data=[]
        for i in range(600):
            el={"type":"node","id":110000+i,"lat":45.08,"lon":7.4,"tags":{"name":f"Demo {i}","shop":"yes","email":f"info{i}@example.test"}}
            data.append(m.from_osm(el,"2026-11-16"))
        a=m.rotate(data,set(),dt.date(2026,11,16))[:280]
        b=m.rotate(data,{r["id"] for r in a},dt.date(2026,11,17))[:280]
        self.assertEqual(len(a),280);self.assertEqual(len(b),280)
        self.assertTrue({r["id"] for r in a}.isdisjoint({r["id"] for r in b}))
        self.assertEqual(len(list(csv.reader(io.StringIO(m.make_csv(a).decode("utf-8-sig")),delimiter=";"))),281)
        z=zipfile.ZipFile(io.BytesIO(m.make_xlsx(a,dt.date(2026,11,16))))
        self.assertEqual(z.read("xl/worksheets/sheet1.xml").count(b"<row "),281)
        self.assertIn(b"LOTTO 280",z.read("xl/workbook.xml"))
    def test_encryption_and_no_marketing_send(self):
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
        pb=private.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo)
        pr=private.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
        raw,report=m.package([],dt.date(2026,11,16))
        cipher=m.encrypted(raw,pb)
        self.assertNotIn(b"CAMPAGNA_AUTORIZZATI.csv",cipher)
        self.assertEqual(decrypt(cipher,pr),raw)
        self.assertEqual(report["consensi_documentati"],0)
        self.assertEqual(report["invii_effettuati"],0)
        corrupt=bytearray(cipher);corrupt[-1]^=1
        with self.assertRaises(Exception):decrypt(bytes(corrupt),pr)
    def test_csv_formula_injection_blocked(self):
        row=m.from_osm({"type":"node","id":5,"lat":45.08,"lon":7.39,"tags":{"name":"=SUM(1,2)","shop":"yes"}},"2026-11-16")
        self.assertIn("'=SUM(1,2)",m.make_csv([row]).decode("utf-8-sig"))
if __name__=="__main__":unittest.main()
