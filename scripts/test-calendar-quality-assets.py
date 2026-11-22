import importlib.util
import tempfile
import sys
sys.dont_write_bytecode = True
import unittest
from pathlib import Path
from PIL import Image, ImageChops

spec = importlib.util.spec_from_file_location('calendar_quality', Path(__file__).with_name('build-calendar-quality-assets.py'))
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)


class CalendarQualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.master = self.root / 'master.png'
        Image.new('RGB', (1290, 2947), '#ab795e').save(self.master)

    def test_repeated_store_builds_leave_master_unchanged(self):
        server = self.root / 'server.webp'
        Image.new('RGB', (830, 1896), '#a8795f').save(server, 'WEBP', quality=81)
        original = server.read_bytes()
        output = self.root / 'preview.webp'
        first = quality.export(server, output)
        second = quality.export(server, output)
        self.assertEqual(first['sha256'], second['sha256'])
        self.assertEqual(server.read_bytes(), original)
        self.assertEqual(output.read_bytes(), original)
        with Image.open(output) as image:
            self.assertEqual(image.size, (830, 1896))

    def test_store_rejects_reencoding_from_a_different_format(self):
        with self.assertRaisesRegex(ValueError, 'exact server WebP'):
            quality.export(self.master, self.root / 'store.webp')

    def test_forbids_overwriting_master(self):
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            quality.export(self.master, self.master)

    def test_forbids_preview_as_master(self):
        preview = self.root / 'store-previews' / 'preview.png'
        preview.parent.mkdir()
        preview.write_bytes(self.master.read_bytes())
        with self.assertRaisesRegex(ValueError, 'derivative'):
            quality.export(preview, self.root / 'result.webp')

    def test_download_rejects_small_native_source_without_upscaling(self):
        small = self.root / '830.png'
        Image.new('RGB', (830, 1896)).save(small)
        destination = self.root / 'background.webp'
        with self.assertRaisesRegex(ValueError, 'too small'):
            quality.export(small, destination, download=True)
        self.assertFalse(destination.exists())

    def test_native_download_preserves_dimensions_and_pixels(self):
        destination = self.root / 'background.webp'
        quality.export(self.master, destination, download=True)
        with Image.open(self.master) as source, Image.open(destination) as output:
            self.assertEqual(output.size, source.size)
            self.assertIsNone(ImageChops.difference(source.convert('RGB'), output.convert('RGB')).getbbox())


if __name__ == '__main__':
    unittest.main()

