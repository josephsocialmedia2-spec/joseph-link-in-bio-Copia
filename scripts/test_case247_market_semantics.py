"""CASE247 semantic, lifecycle and duplicate regression tests. No network."""
from __future__ import annotations

import sys
import json
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import case247_market_semantics as sm
import case247_market_lifecycle as life
import case247_market_consolidate as co

ROME = ZoneInfo("Europe/Rome")


def listing_html(*, town="Almese", contract="Vendita", title="Trilocale in vendita",
                 price=125000, description="", street="Via Rivera 28", available=True):
    offer = {"@type":"Offer", "price": price}
    if available:
        offer["availability"] = "https://schema.org/InStock"
    jsonld = {
        "@context":"https://schema.org", "@type":"Apartment",
        "address":{"@type":"PostalAddress", "addressLocality":town, "streetAddress":street},
        "offers":offer
    }
    return (f"<html><head><title>{title}</title><script type='application/ld+json'>"
            f"{json.dumps(jsonld)}</script></head><body>"
            f"<nav aria-label='breadcrumb'><a>Immobili</a><a>{town}</a><a>{contract}</a></nav>"
            f"<h1>{title}</h1><p>{description}</p></body></html>")


class SemanticTests(unittest.TestCase):
    def test_json_ld_town_beats_free_prose(self):
        html = listing_html(town="Condove",
                            description="A cinque minuti da Avigliana, vicino ad Almese.",
                            street="Borgata Pralesio 6")
        r = sm.inspect_html(html, "F.C. Immobiliare", "AGENZIA",
                            "https://fcimmobiliare.it/i-12345-vendita-casa-condove")
        self.assertEqual(r["verified_town"], "Condove")
        self.assertEqual(r["commune_status"], "Verificato")
        self.assertEqual(r["contract_status"], "Vendita")
        self.assertEqual(r["micro_zone"], "Borgata Pralesio 6")
        self.assertEqual(r["nature"], "Agenzia_Verificata")
        self.assertTrue(r["active_confirmed"])

    def test_exact_property_sale_heading_may_verify_town_but_not_proximity(self):
        valid = ("<html><head><title>Rustico</title></head><body>"
                 "<nav aria-label='breadcrumb'><a>Immobili</a></nav>"
                 "<h1>Rustico in vendita a Condove - Via Roma 36</h1></body></html>")
        good = sm.inspect_html(valid, "F.C. Immobiliare", "AGENZIA",
                               "https://www.fcimmobiliare.it/i-671890-vendita-rustico-condove/")
        self.assertEqual(good["verified_town"], "Condove")
        self.assertEqual(good["contract_status"], "Vendita")
        invalid = ("<html><head><title>Rustico</title></head><body>"
                   "<h1>Rustico in vendita a 5 minuti da Condove</h1></body></html>")
        bad = sm.inspect_html(invalid, "F.C. Immobiliare", "AGENZIA",
                              "https://www.fcimmobiliare.it/i-671891-vendita-rustico-condove/")
        self.assertEqual(bad["commune_status"], "Comune_Da_Verificare")

    def test_www_origin_robots_is_queried_without_bypass(self):
        urls=[]
        html=listing_html(town="Condove", title="Rustico in vendita a Condove")
        def download(url):
            urls.append(url)
            if url.endswith("/robots.txt"):
                return "User-agent: *\nAllow: /\n"
            if url.startswith("https://www.fcimmobiliare.it/"):
                return html
            raise AssertionError("unexpected request " + url)
        parts=[{"listings":[{"town":"Condove",
          "url":"https://www.fcimmobiliare.it/i-671890-vendita-rustico-condove/",
          "source":"F.C. Immobiliare", "source_type":"AGENZIA"}]}]
        out=sm.enrich_sources(parts, downloader=download, sleep=lambda _:None)
        self.assertEqual(out["checked"], 1)
        self.assertIn("https://www.fcimmobiliare.it/robots.txt", urls)
        self.assertTrue(parts[0]["listings"][0]["detail_verified"])

    def test_external_municipality_not_counted(self):
        r=sm.inspect_html(listing_html(town="Rivoli", title="Casa in vendita ad Avigliana"),
                          "Teck", "AGENZIA", "https://teckimmobiliare.it/annuncio/avigliana-10")
        self.assertEqual(r["commune_status"], "Fuori_Perimetro")
        self.assertEqual(r["verified_town"], "")
        self.assertFalse(r["active_confirmed"])

    def test_free_description_never_proves_town(self):
        html="<html><head><title>Bilocale in vendita</title></head><body><h1>Bilocale in vendita</h1><p>A due passi da Condove, vicino ad Almese e ad Avigliana</p></body></html>"
        r=sm.inspect_html(html,"Portale", "", "https://example.it/listing/789")
        self.assertEqual(r["commune_status"], "Comune_Da_Verificare")
        self.assertEqual(r["verified_town"], "")

    def test_labelled_locality_without_json(self):
        html="<html><head><title>Villa in vendita</title></head><body><h1>Villa in vendita</h1><dl><dt>Comune: Avigliana</dt></dl></body></html>"
        r=sm.inspect_html(html,"Portale","","https://example.it/a")
        self.assertEqual(r["commune_status"],"Verificato")
        self.assertEqual(r["verified_town"],"Avigliana")

    def test_rental_and_short_contract(self):
        for signal in ("affitto", "locazione", "canone mensile", "transitorio"):
            r = sm.inspect_html(listing_html(title="Appartamento "+signal),
                                "Agenzia", "AGENZIA", "https://teckimmobiliare.it/a")
            self.assertEqual(r["contract_status"],"Escluso_Affitto", signal)
            self.assertFalse(r["active_confirmed"])

    def test_low_price_is_flag_not_deleted(self):
        r=sm.inspect_html(listing_html(price=12000), "Agenzia", "AGENZIA",
                          "https://teckimmobiliare.it/properties/casa/almese/low-price")
        self.assertEqual(r["contract_status"], "Prezzo_Da_Verificare")
        self.assertFalse(r["active_confirmed"])

    def test_no_agencies_overrides_any_contact_presence(self):
        for ban in ("No agenzie", "NO INTERMEDIARI", "no telemarketing"):
            r=sm.inspect_html(listing_html(description="Si prega: "+ban),
                              "CasaDaPrivato","","https://casadaprivato.it/xxx",phone_public=True)
            self.assertTrue(r["explicit_ban"])
            self.assertEqual(r["contact_status"], "Divieto_Esplicito")

    def test_seller_classification_and_microzone(self):
        r=sm.inspect_html(listing_html(town="Avigliana", street="Via Drubiaglio 10"),
                          "Teck", "AGENZIA", "https://teckimmobiliare.it/a")
        self.assertEqual(r["nature"],"Agenzia_Verificata")
        p=sm.inspect_html(listing_html(town="Almese"),"CasaDaPrivato","",
                          "https://casadaprivato.it/a")
        self.assertEqual(p["nature"],"Privato_Dichiarato")
        self.assertEqual(p["contact_status"],"Divieto_Esplicito")

    def test_santambrogio_exact_and_abbreviated_postal_locality(self):
        for municipality in ("Sant'Ambrogio di Torino", "S. Ambrogio di Torino (TO)",
                             "Sant'Ambrogio (TO)"):
            item=sm.inspect_html(
                listing_html(town=municipality, title="Trilocale in vendita a Sant'Ambrogio"),
                "CasaDaPrivato", "", "https://casadaprivato.it/properties/1")
            self.assertEqual(item["verified_town"], "Sant'Ambrogio di Torino", municipality)
            self.assertEqual(item["commune_status"], "Verificato", municipality)
        self.assertEqual(sm.canonical_town("Sant'Antonino di Susa"), "")

    def test_site_organization_address_not_property_address(self):
        graph = {
            "@context":"https://schema.org",
            "@graph": [
                {"@type":"Organization", "name":"Annunci privati",
                 "address":{"@type":"PostalAddress","addressLocality":"Avigliana"},
                 "offers":{"@type":"Offer","price":"5"}},
                {"@type":"Apartment", "name":"Trilocale in vendita a Condove",
                 "address":{"@type":"PostalAddress","addressLocality":"Condove",
                            "streetAddress":"Via Roma 3"},
                 "offers":{"@type":"Offer","price":"150000",
                           "availability":"https://schema.org/InStock"}}
            ]
        }
        html=("<html><head><title>Trilocale in vendita</title>"
              "<script type='application/ld+json'>"+json.dumps(graph)+
              "</script></head><body><h1>Trilocale in vendita</h1></body></html>")
        item=sm.inspect_html(html,"CasaDaPrivato","",
                             "https://casadaprivato.it/appartamenti/vendita-torino-12345")
        self.assertEqual(item["verified_town"],"Condove")
        self.assertEqual(item["nature"],"Privato_Dichiarato")
        self.assertEqual(item["contract_status"],"Vendita")
        self.assertEqual(item["micro_zone"],"Via Roma 3")
        self.assertTrue(item["active_confirmed"])

    def test_organization_only_does_not_verify_location_or_brokerage(self):
        graph={"@context":"https://schema.org", "@type":"RealEstateAgent",
               "address":{"addressLocality":"Avigliana"},
               "offers":{"@type":"Offer", "price":900}}
        html=("<html><head><title>Villa in vendita</title>"
              "<script type='application/ld+json'>"+json.dumps(graph)+
              "</script></head><body><h1>Villa in vendita</h1></body></html>")
        item=sm.inspect_html(html,"CasaDaPrivato","",
                             "https://casadaprivato.it/villa/xx")
        self.assertEqual(item["commune_status"],"Comune_Da_Verificare")
        self.assertEqual(item["verified_town"],"")
        # Platform/publisher data are not evidence of the actual seller.
        self.assertEqual(item["nature"],"Privato_Dichiarato")
        self.assertEqual(item["contract_status"],"Vendita")

    def test_property_microdata_ignores_agency_office_microdata(self):
        html=("<html><head><title>Appartamento in vendita</title></head><body>"
              '<div itemscope itemtype="https://schema.org/RealEstateAgent">'
              '<meta itemprop="addressLocality" content="Avigliana"></div>'
              '<div itemscope itemtype="https://schema.org/Apartment">'
              '<meta itemprop="addressLocality" content="Almese">'
              '<meta itemprop="streetAddress" content="Via Rivera 28"></div>'
              "<h1>Appartamento in vendita</h1></body></html>")
        item=sm.inspect_html(html,"CasaDaPrivato","",
                             "https://casadaprivato.it/annunci/1234")
        self.assertEqual(item["commune_status"],"Verificato")
        self.assertEqual(item["verified_town"],"Almese")
        self.assertEqual(item["micro_zone"],"Via Rivera 28")

    def test_jsonld_description_denies_agency_contact_even_with_phone_flag(self):
        graph={"@context":"https://schema.org","@type":"House",
               "address":{"addressLocality":"Almese"},
               "description":"Vendita tra privati, no agenzia, grazie.",
               "offers":{"price":"190000"}}
        page=("<html><head><title>Casa in vendita</title>"
              '<script type="application/ld+json">'+json.dumps(graph)+
              "</script></head><body><h1>Casa in vendita</h1></body></html>")
        item=sm.inspect_html(page,"Fonte privata","","https://example.it/annunci/2",
                             phone_public=True)
        self.assertEqual(item["contact_status"],"Divieto_Esplicito")
        self.assertTrue(item["explicit_ban"])

    def test_no_sale_verb_does_not_automatically_mean_sale(self):
        html=("<html><head><title>Villa privata</title></head>"
              "<body><h1>Villa</h1><span>Consulenza gratuita</span></body></html>")
        item=sm.inspect_html(html,"Portale","","https://example.it/annunci/1")
        self.assertEqual(item["contract_status"],"Contratto_Da_Verificare")

    def test_robots_fail_closed(self):
        def download(url):
            if url.endswith("robots.txt"):
                raise OSError("blocked")
            raise AssertionError("HTML must not be downloaded")
        parts=[{"listings":[{"town":"Almese", "url":"https://teckimmobiliare.it/properties/casa/almese/example",
                              "source":"Teck","source_type":"AGENZIA"}]}]
        out=sm.enrich_sources(parts, downloader=download, sleep=lambda _:None)
        self.assertEqual(out["attempted"],0)
        self.assertFalse(parts[0]["listings"][0]["detail_verified"])


class LifecycleTests(unittest.TestCase):
    def test_first_seen_retained_last_verified_updated_when_checked(self):
        now=datetime(2026,11,16,8,0,tzinfo=ROME)
        row={"url":"https://example.it/annuncio/100","detail_verified":True,
             "stale":False, "commune_status":"Verificato",
             "contract_status":"Vendita","active_confirmed":True}
        state={row["url"]:{"first_seen":"2026-08-17","last_verified":"2026-11-15"}}
        out=life.apply_lifecycle([row],state,now)
        self.assertEqual(row["data_prima_rilevazione"],"2026-08-17")
        self.assertEqual(row["data_ultima_verifica"],"2026-11-16")
        self.assertEqual(row["giorni_sul_mercato"],91)
        self.assertEqual(row["priorita_monitoraggio"],"Invenduto_Oltre_90gg")
        self.assertEqual(out[row["url"]]["first_seen"],"2026-08-17")

    def test_history_not_relabelled_as_current_verification(self):
        now=datetime(2026,11,16,8,0,tzinfo=ROME)
        row={"url":"https://example.it/annuncio/100","detail_verified":False,
             "stale":True,"commune_status":"Comune_Da_Verificare",
             "contract_status":"Contratto_Da_Verificare","active_confirmed":False}
        old={row["url"]:{"first_seen":"2026-06-01","last_verified":"2026-11-15"}}
        life.apply_lifecycle([row],old,now)
        self.assertEqual(row["data_ultima_verifica"],"2026-11-15")
        self.assertEqual(row["priorita_monitoraggio"],"Da_Verificare")

    def test_lifecycle_json_persists_first_seen(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/"run1/lifecycle.json"
            life.write_state(path,{"https://example.it/a":{"first_seen":"2026-08-01",
                                                              "last_verified":"2026-11-10"}})
            x=life.load_state(Path(d))
            self.assertEqual(x["https://example.it/a"]["first_seen"],"2026-08-01")


class ConsolidationTests(unittest.TestCase):
    def test_unverified_not_in_confirmed_count(self):
        now=datetime(2026,11,16,8,0,tzinfo=ROME)
        part={"sources":[],"listings":[
            {"source":"A","town":"Almese","url":"https://example.it/annunci/101",
             "price":180000,"mq":80, "contract_status":"Vendita",
             "commune_status":"Verificato","verified_town":"Almese","detail_verified":True,
             "active_confirmed":True},
            {"source":"B","town":"Almese","url":"https://example.it/annunci/102",
             "price":180000,"mq":80, "commune_status":"Comune_Da_Verificare"},
            {"source":"C","town":"Almese","url":"https://example.it/annunci/103",
             "contract_status":"Escluso_Affitto",
             "commune_status":"Verificato","verified_town":"Almese"},
            {"source":"D","town":"Almese","url":"https://example.it/annunci/104",
             "contract_status":"Vendita","commune_status":"Fuori_Perimetro"},
        ]}
        result=co.merge([part],now=now)
        self.assertEqual(result["listing_count"],4)
        self.assertEqual(result["counts"]["Almese"],1)
        self.assertEqual(result["indexed_counts"]["Almese"],4)
        self.assertEqual(result["possible_duplicate_count"],2)
        self.assertTrue(all(row["url"] for row in result["listings"]))
        self.assertTrue(any(row["nature"]=="Da_Verificare" for row in result["listings"]))
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/"test.xlsx"
            co.write_xlsx(result,out)
            with zipfile.ZipFile(out) as z:
                self.assertEqual(sum(x.startswith("xl/worksheets/sheet") and x.endswith(".xml")
                                     for x in z.namelist()),3)
                ann=z.read("xl/worksheets/sheet1.xml").decode()
                summary=z.read("xl/worksheets/sheet3.xml").decode()
                for field in ("Natura_Inserzionista","Stato_Contatto_Commerciale",
                              "Data_Prima_Rilevazione","Giorni_Sul_Mercato",
                              "Possibile_Duplicato"):
                    self.assertIn(field,ann)
                self.assertIn("NATURA_INSERZIONISTA",summary)
                self.assertIn("FASCIA_PERMANENZA",summary)
                self.assertIn("Almese",summary)


if __name__=="__main__":
    unittest.main()
