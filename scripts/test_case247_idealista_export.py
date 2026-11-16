"""Tests: standard-library CSV/XLSX importer and privacy-safe crosspost matching."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from case247_idealista_export import parse_export
from case247_market_consolidate import merge, write_xlsx, HEADERS


class IdealistaImportTests(unittest.TestCase):
    def csv_file(self, root: Path) -> Path:
        path = root / "idealista.csv"
        path.write_text(
            "Comune;Link annuncio;Altri portali;Titolo;Indirizzo;Prezzo;Mq;Telefono;Operazione\n"
            "Avigliana;https://example.it/annuncio/avigliana-321;https://other.it/villa/321;"
            "Appartamento 333 123 4567;Via Roma 3;165.000;85;333 123 4567;Vendita\n"
            "Rivoli;https://example.it/annuncio/rivoli-12;;Casa;Via Roma 9;100.000;55;3214567810;Vendita\n"
            "Condove;https://example.it/affitto/condove-12;;Bilocale;;600;60;;Affitto\n"
            "Almese;NON_URL;;Rustico;;95000;110;;Vendita\n",
            encoding="utf-8-sig"
        )
        return path

    def test_csv_filters_scope_and_redacts_phone(self):
        with tempfile.TemporaryDirectory() as d:
            report = parse_export(self.csv_file(Path(d)))
        self.assertEqual(len(report["listings"]), 1)
        row = report["listings"][0]
        self.assertEqual(row["town"], "Avigliana")
        self.assertEqual(row["price"], 165000)
        self.assertEqual(row["mq"], 85)
        self.assertEqual(row["phone_availability"], "PRESENTE_NEL_FILE_DA_VERIFICARE")
        self.assertEqual(row["related_urls"], ["https://other.it/villa/321"])
        serialized = json.dumps(report)
        self.assertNotIn("333 123 4567", serialized)
        self.assertNotIn("3214567810", serialized)
        self.assertEqual(report["diagnostics"]["excluded_town"], 1)
        self.assertEqual(report["diagnostics"]["excluded_rental"], 1)
        self.assertEqual(report["diagnostics"]["excluded_without_url"], 1)

    def test_xlsx_real_hyperlink_relationships(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "idealista.xlsx"
            ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            xr = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            body = (
              f'<worksheet xmlns="{ns}" xmlns:r="{xr}"><sheetData>'
              '<row r="1"><c r="A1" t="inlineStr"><is><t>Comune</t></is></c>'
              '<c r="B1" t="inlineStr"><is><t>Link annuncio</t></is></c>'
              '<c r="C1" t="inlineStr"><is><t>Telefono</t></is></c></row>'
              '<row r="2"><c r="A2" t="inlineStr"><is><t>Condove</t></is></c>'
              '<c r="B2" t="inlineStr"><is><t>Apri scheda</t></is></c>'
              '<c r="C2" t="inlineStr"><is><t>3340001111</t></is></c></row>'
              '</sheetData><hyperlinks><hyperlink ref="B2" r:id="rId1"/></hyperlinks></worksheet>'
            )
            rels = ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
                    'Target="https://example.it/annuncio/condove-123456" TargetMode="External"/></Relationships>')
            with zipfile.ZipFile(path, "w") as pkg:
                pkg.writestr("xl/worksheets/sheet1.xml", body)
                pkg.writestr("xl/worksheets/_rels/sheet1.xml.rels", rels)
            report = parse_export(path)
        self.assertEqual(len(report["listings"]), 1)
        self.assertEqual(report["listings"][0]["url"], "https://example.it/annuncio/condove-123456")
        self.assertNotIn("3340001111", json.dumps(report))

    def test_same_property_crosspost_linked_by_export_and_radar(self):
        with tempfile.TemporaryDirectory() as d:
            idealista = parse_export(self.csv_file(Path(d)))
            portal = {"sources":[{"source":"Portale di prova","town":"Avigliana","status":"OK"}],
                      "listings":[{"town":"Avigliana","url":"https://other.it/villa/321",
                                   "title":"Immobile in Avigliana","source":"Portale di prova",
                                   "owner_status":"DA_VERIFICARE"}]}
            result = merge([idealista, portal])
        self.assertEqual(result["listing_count"], 2)
        self.assertEqual(result["independent_crosspost_matches"], 2)
        self.assertEqual(result["crosspost_records"], 1)
        self.assertTrue(all(row["possibly_duplicate"] for row in result["listings"]))
        self.assertEqual({row["phone_availability"] for row in result["listings"]},
                         {"NON_DISPONIBILE","PRESENTE_NEL_FILE_DA_VERIFICARE"})
        self.assertTrue(all(row["contact_permission"] != "CONTATTABILE" for row in result["listings"]))

    def test_same_price_and_mq_not_merged(self):
        out = merge([{"sources":[], "listings":[
            {"source":"A", "town":"Avigliana", "url":"https://site.it/annunci/1","price":100000,"mq":90},
            {"source":"B", "town":"Avigliana", "url":"https://site.it/annunci/2","price":100000,"mq":90}
        ]}])
        self.assertEqual(out["listing_count"],2)
        self.assertTrue(all(r["possibly_duplicate"] for r in out["listings"]))

    def test_three_sheet_xlsx_no_raw_phone(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            result = merge([parse_export(self.csv_file(folder))])
            xlsx = folder / "out.xlsx"
            write_xlsx(result, xlsx)
            with zipfile.ZipFile(xlsx) as z:
                self.assertIn("xl/worksheets/sheet3.xml", z.namelist())
                self.assertNotIn("xl/worksheets/sheet4.xml", z.namelist())
                all_xml = "".join(z.read(n).decode("utf-8", "replace")
                                  for n in z.namelist() if n.endswith(".xml"))
                self.assertNotIn("333 123 4567", all_xml)
                self.assertIn("PRESENTE_NEL_FILE_DA_VERIFICARE", all_xml)
                self.assertIn("Altri link associati", all_xml)
                self.assertEqual(len(HEADERS), 29)

    def test_missing_required_columns_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"bad.csv"
            path.write_text("Comune;Telefono\nAvigliana;3399999999\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Comune"):
                parse_export(path)


if __name__ == "__main__":
    unittest.main()
