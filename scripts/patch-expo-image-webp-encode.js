/**
 * expo-image WebPCoder defaults to SDImageAWebPCoder (Apple ImageIO).
 * ImageIO can decode WebP but cannot encode it, so disk-cache writes after
 * resize/blur spam:
 *   unsupported output file format 'org.webmproject.webp'
 * Force encode through SDImageWebPCoder (libwebp) instead.
 */

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-image',
  'ios',
  'Coders',
  'WebPCoder.swift',
);

const marker = 'pokit: encode WebP with libwebp';

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
if (source.includes(marker)) {
  process.exit(0);
}

const from = `  func canEncode(to format: SDImageFormat) -> Bool {
    return self.coder.canEncode(to: format)
  }

  func encodedData(with image: UIImage?, format: SDImageFormat, options: [SDImageCoderOption: Any]? = nil) -> Data? {
    return self.coder.encodedData(with: image, format: format, options: options)
  }`;

const to = `  func canEncode(to format: SDImageFormat) -> Bool {
    // pokit: encode WebP with libwebp — Apple ImageIO has no WebP destination UTI.
    return SDImageWebPCoder.shared.canEncode(to: format)
  }

  func encodedData(with image: UIImage?, format: SDImageFormat, options: [SDImageCoderOption: Any]? = nil) -> Data? {
    // pokit: encode WebP with libwebp — Apple ImageIO has no WebP destination UTI.
    return SDImageWebPCoder.shared.encodedData(with: image, format: format, options: options)
  }`;

if (!source.includes(from)) {
  console.warn('[patch-expo-image-webp-encode] expected WebPCoder encode methods not found; skip');
  process.exit(0);
}

fs.writeFileSync(target, source.replace(from, to));
console.log('[patch-expo-image-webp-encode] patched expo-image WebP encode path');
