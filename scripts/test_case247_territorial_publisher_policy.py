"""Offline regression tests for the CASE247 10 km publication security boundary."""
import unittest

from case247_territorial_engine import RADIUS_KM
from case247_territorial_publisher import valid_plan_radius, verified_ten_km_assignment


def example_listing():
    return {
        "id": "101", "town_id": "vaie", "location_status": "VERIFICATO_FONTE",
        "availability_status": "AVAILABLE", "title": "Annuncio verificato",
        "image": "https://cdn.shopify.com/item.jpg",
        "url": "https://lasacraimmobiliare.it/products/annuncio-verificato",
    }


def town(identifier):
    return {"id": identifier, "name": identifier}


def geography():
    return {
        "vaie": {"lat": 45.10, "lon": 7.29, "bbox": [45.09, 45.11, 7.28, 7.30]},
        "condove": {"lat": 45.11, "lon": 7.32, "bbox": [45.10, 45.12, 7.31, 7.33]},
        "torino": {"lat": 45.07, "lon": 7.69, "bbox": [45.06, 45.08, 7.68, 7.70]},
    }


class PublisherPolicyTests(unittest.TestCase):
    def setUp(self):
        self.listing = example_listing()
        self.geo = geography()
        self.towns = [town("vaie"), town("condove"), town("torino")]

    def test_radius_configuration_is_ten(self):
        self.assertEqual(RADIUS_KM, 10.0)
        self.assertTrue(valid_plan_radius({"max_distance_km": 10}))
        for radius in (20, 0, -1, True, None, "10"):
            with self.subTest(radius=radius):
                self.assertFalse(valid_plan_radius({"max_distance_km": radius}))

    def test_verified_nearby_listing_is_allowed(self):
        item = {"town_id": "vaie", "source_town_id": "vaie",
                "distance_upper_bound_km": 2.0}
        self.assertFalse(verified_ten_km_assignment(item, self.listing, self.towns, self.geo))
        from case247_territorial_engine import eligible_towns
        actual = dict((t["id"], distance)
                      for t, distance in eligible_towns(self.listing, self.towns, self.geo))
        item["distance_upper_bound_km"] = actual["vaie"]
        self.assertTrue(verified_ten_km_assignment(item, self.listing, self.towns, self.geo))

    def test_forged_distance_does_not_override_geofence(self):
        item = {"town_id": "torino", "source_town_id": "vaie",
                "distance_upper_bound_km": 0.01}
        self.assertFalse(verified_ten_km_assignment(item, self.listing, self.towns, self.geo))

    def test_source_and_geo_must_remain_verified(self):
        from case247_territorial_engine import eligible_towns
        d = dict((t["id"], distance)
                 for t, distance in eligible_towns(self.listing, self.towns, self.geo))
        item = {"town_id": "vaie", "source_town_id": "vaie",
                "distance_upper_bound_km": d["vaie"]}
        self.assertFalse(verified_ten_km_assignment(
            {**item, "source_town_id": "torino"}, self.listing, self.towns, self.geo))
        self.assertFalse(verified_ten_km_assignment(item, self.listing, self.towns, {}))
        self.assertFalse(verified_ten_km_assignment(
            item, {**self.listing, "location_status": "DA_VERIFICARE"},
            self.towns, self.geo))

    def test_missing_or_invalid_distance_is_blocked(self):
        item = {"town_id": "vaie", "source_town_id": "vaie",
                "distance_upper_bound_km": 20}
        for value in (20, True, None, "2", -1):
            with self.subTest(value=value):
                item["distance_upper_bound_km"] = value
                self.assertFalse(verified_ten_km_assignment(
                    item, self.listing, self.towns, self.geo))


if __name__ == "__main__":
    unittest.main()
