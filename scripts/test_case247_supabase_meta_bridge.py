"""Unit tests for Supabase Meta bridge authorization. No live network calls."""
import unittest
from unittest.mock import patch
from case247_supabase_meta_bridge import BridgeError, effective_config, verified_bridge_url, fetch_verified_channels

class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.config={"towns":[{"id":"avigliana","channels":{"facebook":{"status":"DA_VERIFICARE","url":""},
                           "instagram":{"status":"DA_VERIFICARE","url":""}},"auto_publish":False}]}
        self.ok={"avigliana":{"facebook":{"status":"ACTIVE_VERIFIED","publishing_enabled":True,
                "provider_id":"12345","url":"https://www.facebook.com/12345"}}}

    def test_config_without_provider_is_blocked(self):
        res=effective_config(self.config,{})
        self.assertFalse(res["towns"][0]["auto_publish"])
        self.assertNotEqual(res["towns"][0]["channels"]["facebook"]["status"],"ACTIVE_VERIFIED")

    def test_meta_verified_config_is_enabled(self):
        res=effective_config(self.config,self.ok)
        self.assertTrue(res["towns"][0]["auto_publish"])
        self.assertEqual(res["towns"][0]["channels"]["facebook"]["provider_id"],"12345")

    def test_unknown_territory_fails(self):
        with self.assertRaises(BridgeError):
            effective_config(self.config,{"other":{}})

    def test_bad_url_is_rejected(self):
        with patch.dict("os.environ",{"CASE247_META_BRIDGE_URL":"http://localhost/evil"}):
            with self.assertRaises(BridgeError):
                verified_bridge_url()

    def test_missing_bridge_key_fails_closed(self):
        with patch.dict("os.environ",{"CASE247_REGIA_BRIDGE_KEY":""}):
            with self.assertRaises(BridgeError):
                fetch_verified_channels("metadata")

    def test_no_network_metadata_broker_with_secure_key(self):
        with patch.dict("os.environ",{"CASE247_REGIA_BRIDGE_KEY":"m"*64}):
            with patch("case247_supabase_meta_bridge.urllib.request.urlopen",
                        side_effect=TimeoutError):
                with self.assertRaises(BridgeError):
                    fetch_verified_channels("metadata")

if __name__=="__main__":
    unittest.main()
