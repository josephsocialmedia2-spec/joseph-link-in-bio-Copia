import tempfile
import unittest
from pathlib import Path
from PIL import Image
from case247_validate_graphics import validate_image,review_manifest

class ImageTests(unittest.TestCase):
    def test_valid_jpeg(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/"valid.jpg"
            Image.new("RGB",(1080,1350),(5,12,60)).save(p,format="JPEG")
            sha,reason=validate_image(p,1080,1350)
            self.assertEqual(reason,None)
            self.assertEqual(len(sha),64)
    def test_truncated_jpeg_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/"broken.jpg"
            Image.new("RGB",(1080,1350)).save(p,format="JPEG")
            p.write_bytes(p.read_bytes()[:-200])
            _,reason=validate_image(p,1080,1350)
            self.assertIsNotNone(reason)
    def test_wrong_dimensions_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/"wrong.jpg"
            Image.new("RGB",(10,10)).save(p,format="JPEG")
            _,reason=validate_image(p,1080,1350)
            self.assertEqual(reason,"IMAGE_FORMAT_OR_DIMENSIONS")
    def test_60_required(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                review_manifest(Path(directory),{"total":1,"expected_width":1080,
                    "expected_height":1350,"entries":[]})

if __name__=="__main__":
    unittest.main()
