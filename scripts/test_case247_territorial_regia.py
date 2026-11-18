import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from case247_territorial_regia import distance_km,plan

def town(id,lat,lon):
    return {"id":id,"name":id,"landing_url":"https://example.com/"+id,
            "channels":{"facebook":{"url":"https://facebook.com/"+id,"status":"VERIFICATO"},
                        "instagram":{"url":"https://instagram.com/"+id,"status":"VERIFICATO"}},
            "auto_publish":True}

def item(id,lat,lon,location="a"):
    return {"id":id,"title":"House "+id,"url":"https://example.com/listing/"+id,
            "image":"https://example.com/a.jpg","latitude":lat,"longitude":lon,
            "town_id":location,"location_status":"VERIFICATO_FONTE"}
class RoutingTests(unittest.TestCase):
    def setUp(self):
        self.day=dt.date(2026,11,12)
        self.towns={"towns":[town("a",45,7),town("b",45.08,7.01),town("far",47,7)]}
        self.coords={"towns":{"a":{"lat":45,"lon":7},"b":{"lat":45.08,"lon":7.01},
                              "far":{"lat":47,"lon":7}}}
        self.media={"entries":[]}
    def run_plan(self,items,prior=None):
        return plan({"items":items},self.towns,self.media,self.coords,self.day,prior)
    def test_haversine(self):
        self.assertAlmostEqual(distance_km((45,7),(45,7)),0)
        self.assertGreater(distance_km((45,7),(47,7)),20)
    def test_exactly_one_post_per_property(self):
        x=self.run_plan([item("1",45,7),item("2",45.08,7.01)])
        self.assertEqual(len(x["property_posts"]),2)
        self.assertEqual(len({v["listing_id"] for v in x["property_posts"]}),2)
    def test_no_unverified_location(self):
        it=item("1",45,7);it["location_status"]="DA_VERIFICARE"
        x=self.run_plan([it])
        self.assertEqual(len(x["property_posts"]),0)
    def test_no_coordinates_no_publish(self):
        it=item("1",45,7);it.pop("latitude")
        x=self.run_plan([it])
        self.assertEqual(x["blocked"][0]["reason"],"PROPERTY_COORDINATES_REQUIRED_FOR_STRICT_20KM")
    def test_existing_day_listing_skipped(self):
        x=self.run_plan([item("1",45,7)],[{"date":self.day.isoformat(),"listing_id":"1",
             "town_id":"a","network":"facebook","time":"00:00"}])
        self.assertEqual(len(x["property_posts"]),0)
    def test_distant_towns_rejected(self):
        self.towns["towns"]=[self.towns["towns"][2]]
        x=self.run_plan([item("1",45,7)])
        self.assertEqual(len(x["property_posts"]),0)
    def test_no_account_no_publish(self):
        for t in self.towns["towns"]:t["auto_publish"]=False
        self.assertEqual(len(self.run_plan([item("1",45,7)])["property_posts"]),0)
    def test_future_removed_listing_blocked(self):
        it=item("1",45,7);it["status"]="venduto"
        self.assertEqual(len(self.run_plan([it])["property_posts"]),0)
if __name__=="__main__":unittest.main()
