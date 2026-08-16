import sharp from "sharp";
import { writeFileSync } from "fs";

async function icon(size, file) {
  const rx = Math.round(size * 0.18);
  const font = Math.round(size * 0.38);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" rx="${rx}" fill="#0f172a"/><text x="50%" y="56%" text-anchor="middle" font-family="Arial" font-size="${font}" font-weight="700" fill="#38bdf8">PG</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(file, buf);
}

await icon(192, "public/pwa-192x192.png");
await icon(512, "public/pwa-512x512.png");
console.log("wrote icons");
