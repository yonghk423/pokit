const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

// Bundle previews ahead of time: small controls must not decode the wallpaper
// or wait for a device-side conversion on their first appearance.
async function main() {
  const directory = path.join(__dirname, '../assets/pro-photo-calendars');
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.webp') && !name.endsWith('-thumb.webp'))) {
    const source = path.join(directory, name);
    const destination = source.replace(/\.webp$/, '-thumb.webp');
    await sharp(source).resize({ height: 384, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 }).toFile(destination);
    console.log(`${name}: ${fs.statSync(source).size} -> ${fs.statSync(destination).size} bytes`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
