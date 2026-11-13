"""Deterministic tests for CASE247 daily territorial distribution."""
import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from case247_territorial_engine import (
    distance_km, eligible_towns, make_plan, normalize_changes,
    PROPERTY_SLOTS, GRAPHIC_SLOTS, repair_future_today,
)

def town(tid, active=True):
    channel = lambda: {"status": "ACTIVE_VERIFIED" if active else "DA_COLLEGARE",
                      "provider_id": "123" if active else "", "url": "https://example.org/account"}
    return {"id": tid, "name": tid, "landing_url": "https://example.org/"+tid,
            "channels": {"facebook": channel(), "instagram": channel()}, "auto_publish": active}

def listing(pid, tid="vaie", available=True):
    return {"id": str(pid), "title": "CASA TEST", "town_id": tid,
            "location_status": "VERIFICATO_FONTE",
            "availability_status": "AVAILABLE" if available else "SOLD_OUT",
            "image": "https://cdn.shopify.com/test.jpg", "url": "https://example.org/listing/"+str(pid),
            "description": "", "price": 30000}

def geo():
    # Vaie and Condove about ~7 km apart; other town far outside 20 km.
    return {"vaie": {"lat":45.10, "lon":7.29, "bbox":[45.09,45.11,7.28,7.30]},
            "condove":{"lat":45.11,"lon":7.32,"bbox":[45.10,45.12,7.31,7.33]},
            "torino":{"lat":45.07,"lon":7.69,"bbox":[45.06,45.08,7.68,7.70]}}

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.towns = [town(x) for x in ("vaie","condove","torino")]
        self.graphics = [{"id":str(i),"public_image_url":f"https://example.org/{i}.jpg",
                          "ai_generated":True,"topic":"Ricostruzione IA"} for i in range(60)]
        self.geo = geo()
        self.day = "2026-11-12"

    def test_distance(self):
        self.assertAlmostEqual(distance_km(0,0,0,0), 0)
        self.assertGreater(distance_km(45.10,7.29,45.07,7.69), 20)

    def test_geofence_excludes_distant_town(self):
        eligible = eligible_towns(listing(1),self.towns,self.geo)
        self.assertIn("vaie",[t["id"] for t,_ in eligible])
        self.assertIn("condove",[t["id"] for t,_ in eligible])
        self.assertNotIn("torino",[t["id"] for t,_ in eligible])

    def test_all_listings_unique_across_both_networks(self):
        data = [listing(i) for i in range(1,9)]
        plan = make_plan(self.day,data,self.towns,self.geo,self.graphics)
        ads = [x for x in plan["assignments"] if x["type"] == "IMMOBILE"]
        self.assertEqual(len(ads),8)
        self.assertEqual(len({x["listing_id"] for x in ads}),8)
        self.assertTrue(all(x["distance_upper_bound_km"]<=20 for x in ads))
        self.assertTrue(all(x["time"] in PROPERTY_SLOTS for x in ads))

    def test_unavailable_and_unverified_never_scheduled(self):
        p = listing(1,available=False)
        q = listing(2)
        q["location_status"] = "DA_VERIFICARE"
        r = listing(3)
        r["image"] = "https://example.org/ChatGPTImage.png"
        plan = make_plan(self.day,[p,q,r],self.towns,self.geo,self.graphics)
        self.assertEqual(plan["unique_listings_planned"],0)

    def test_absent_geo_blocks_instead_of_guess(self):
        p = listing(1)
        plan = make_plan(self.day,[p],self.towns,{},self.graphics)
        self.assertEqual(plan["unique_listings_planned"],0)
        self.assertIn(p["id"],plan["unassigned"])

    def test_unconnected_accounts_never_marked_ready(self):
        towns = [town("vaie",active=False)]
        plan = make_plan(self.day,[listing(1)],towns,self.geo,self.graphics)
        self.assertEqual(plan["ready_for_provider"],0)
        self.assertTrue(all(a["status"]=="BLOCKED_CHANNEL_NOT_CONNECTED" for a in plan["assignments"]))

    def test_no_overbooking_in_same_account(self):
        plan = make_plan(self.day,[listing(i) for i in range(1,35)],
                         self.towns,self.geo,self.graphics)
        occupied = [(a["town_id"],a["network"],a["time"]) for a in plan["assignments"]]
        self.assertEqual(len(occupied),len(set(occupied)))
        self.assertEqual(plan["unique_listings_planned"]+len(plan["unassigned"]),34)
        self.assertTrue(all(a["time"] in GRAPHIC_SLOTS for a in plan["assignments"] if a["type"]=="DIETRO_LE_QUINTE"))

    def test_catalog_reconcile_detects_removed_and_changed(self):
        old = normalize_changes([listing(1),listing(2)],{})["after"]
        changed = listing(1); changed["price"] = 32000
        delta = normalize_changes([changed,listing(3)],old)
        self.assertEqual(delta["removed_ids"],["2"])
        self.assertEqual(delta["added_ids"],["3"])
        self.assertEqual(delta["changed_ids"],["1"])

    def test_18pm_removal_does_not_reuse_next_listing(self):
        removed = listing(1)
        nxt = listing(2)
        candidate = listing(3)
        today = {"date":self.day,"assignments":[
            {"type":"IMMOBILE","listing_id":"1","town_id":"vaie","town":"vaie",
             "network":"facebook","date":self.day,"time":"20:00",
             "media_url":removed["image"],"title":removed["title"],"price":removed["price"]},
            {"type":"IMMOBILE","listing_id":"2","town_id":"vaie","town":"vaie",
             "network":"instagram","date":self.day,"time":"20:00",
             "media_url":nxt["image"],"title":nxt["title"],"price":nxt["price"]},
        ]}
        fixed,counts = repair_future_today(self.day,[nxt,candidate],self.towns,self.geo,today)
        self.assertEqual(counts["replaced"],1)
        self.assertEqual([p["listing_id"] for p in fixed["assignments"]],["3","2"])
        self.assertLessEqual(fixed["assignments"][0]["distance_upper_bound_km"],20)

    def test_18pm_price_change_updates_future_post_only(self):
        old = listing(1)
        future={"date":self.day,"assignments":[
            {"type":"IMMOBILE","listing_id":"1","town_id":"vaie","town":"vaie",
             "network":"facebook","date":self.day,"time":"20:00",
             "media_url":old["image"],"title":old["title"],"price":old["price"],
             "caption":"old price"},
        ]}
        edited=listing(1);edited["price"]=46000
        fixed,counts=repair_future_today(self.day,[edited],self.towns,self.geo,future)
        self.assertEqual(counts["updated"],1)
        self.assertEqual(fixed["assignments"][0]["price"],46000)
        self.assertIn("46.000",fixed["assignments"][0]["caption"])

    def test_legacy_url_query_does_not_bypass_reservation(self):
        item = listing(1)
        item["url"] = "https://www.lasacraimmobiliare.it/products/test-casa/?utm_medium=post"
        self.assertEqual(make_plan(self.day,[item],self.towns,self.geo,self.graphics,
                         reserved_urls={"https://lasacraimmobiliare.it/products/test-casa"})["unique_listings_planned"],0)

    def test_pending_graphics_not_eligible(self):
        item = listing(1)
        self.graphics[0]["approval"] = "PENDING"
        self.graphics[0]["requires_fact_check"] = True
        plan = make_plan(self.day,[item],self.towns,self.geo,self.graphics)
        self.assertEqual(plan["graphic_posts_planned"],0)

    def test_approved_fact_checked_graphic_eligible(self):
        item = listing(1)
        self.graphics[0]["approval"] = "APPROVED"
        self.graphics[0]["requires_fact_check"] = False
        plan = make_plan(self.day,[item],self.towns,self.geo,self.graphics)
        self.assertEqual(plan["graphic_posts_planned"],1)

    def test_same_day_result_is_deterministic(self):
        data = [listing(i) for i in range(1,7)]
        self.assertEqual(make_plan(self.day,data,self.towns,self.geo,self.graphics),
                         make_plan(self.day,data,self.towns,self.geo,self.graphics))

if __name__=="__main__":
    unittest.main()
