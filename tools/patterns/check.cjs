/* Verifies the live background tiles (tools/patterns/animate.py).
   1. Fidelity: each live tile with its animation stripped (out/*.still.svg)
      against the still tile decoded from gift.css (src/*.svg, extract.py).
   2. Motion: on /gift/sample?bg=<scene> the band gets data-live and its
      pattern changes between two frames 600ms apart with the layer drift
      paused (so only the icons inside the tile can have moved).
   3. Reduced motion: no data-live, and two frames are identical.
   4. A contact sheet and a short recording in tools/patterns/.
   Run with the dev server on :5299:  node tools/patterns/check.cjs [--video] [--snow]
   (--snow: tools/patterns/preview-snow.mp4, 8 s of the Snow band) */
const puppeteer = require("/Users/samuelwhite/.npm/_npx/fd355c6121ed2f2b/node_modules/puppeteer");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DIR = __dirname;
const SHOTS = path.join(DIR, "shots");
const BASE = "http://localhost:5299/gift/sample?bg=";
const SCENES = ["picnic", "night", "confetti", "airmail", "sunrise", "ridge", "hearts", "sprinkles", "daisies", "xoxo", "smileys",
  "flannel", "lunch", "sunburst", "leaves", "thanksgiving", "hanukkah", "christmas", "newyear", "holiday", "snow"];
const COVER = { sunrise: [400, 800], ridge: [400, 800], sunburst: [800, 800] };
fs.mkdirSync(SHOTS, { recursive: true });

async function diffPngs(page, a, b) {
  return page.evaluate(async (a, b) => {
    const load = async (src) => { const i = new Image(); i.src = src; await i.decode(); return i; };
    const [x, y] = await Promise.all([load(a), load(b)]);
    const c = document.createElement("canvas"); c.width = x.width; c.height = x.height;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(x, 0, 0); const p = g.getImageData(0, 0, c.width, c.height).data;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(y, 0, 0); const q = g.getImageData(0, 0, c.width, c.height).data;
    let d = 0; for (let i = 0; i < p.length; i += 4) if (Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])) > 24) d++;
    return d / (p.length / 4);
  }, a, b);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "shell", args: ["--disable-gpu"] });
  const util = await browser.newPage();
  await util.goto("about:blank");

  /* 1. Fidelity */
  console.log("── fidelity (share of pixels that differ, still vs original)");
  for (const s of SCENES) {
    const orig = fs.readFileSync(path.join(DIR, "src", `${s}.svg`), "utf8");
    const mine = fs.readFileSync(path.join(DIR, "out", `${s}.still.svg`), "utf8");
    const frac = await util.evaluate(async (a, b, cover) => {
      const ras = async (t) => {
        const i = new Image(); i.src = "data:image/svg+xml," + encodeURIComponent(t); await i.decode();
        const [w, h] = cover || [576, 576];
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (cover) g.drawImage(i, 0, 0, w, h); else { g.fillStyle = g.createPattern(i, "repeat"); g.fillRect(0, 0, w, h); }
        return g.getImageData(0, 0, w, h).data;
      };
      const [p, q] = [await ras(a), await ras(b)];
      let d = 0; for (let k = 0; k < p.length; k += 4) if (Math.max(...[0, 1, 2, 3].map((j) => Math.abs(p[k + j] - q[k + j]))) > 40) d++;
      return d / (p.length / 4);
    }, orig, mine, COVER[s] || null);
    console.log(`${s.padEnd(14)} ${(frac * 100).toFixed(3)}%`);
  }

  /* 2. Motion */
  console.log("── motion (pattern pixels changed in 600ms, drift paused)");
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  const results = {};
  for (const s of SCENES) {
    await page.goto(BASE + s, { waitUntil: "networkidle0" });
    await page.addStyleTag({ content: ".gft-a-band > :not(.gft-scene) { visibility: hidden !important; }" });
    await new Promise((r) => setTimeout(r, 3000));
    const live = await page.$eval(".gft-scene-pat", (e) => e.hasAttribute("data-live"));
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const band = await page.$("header.gft-a-band");
    const box = await band.boundingBox();
    const clip = { x: box.x, y: box.y, width: Math.min(box.width, 390), height: Math.min(box.height, 520) };
    const a = await page.screenshot({ clip, encoding: "base64" });
    await new Promise((r) => setTimeout(r, 600));
    const b = await page.screenshot({ clip, encoding: "base64" });
    fs.writeFileSync(path.join(SHOTS, `${s}-a.png`), Buffer.from(a, "base64"));
    fs.writeFileSync(path.join(SHOTS, `${s}-b.png`), Buffer.from(b, "base64"));
    const d = await diffPngs(util, "data:image/png;base64," + a, "data:image/png;base64," + b);
    results[s] = { live, d };
    console.log(`${s.padEnd(14)} data-live=${live} changed=${(d * 100).toFixed(2)}%`);
  }

  /* 3. Reduced motion */
  console.log("── reduced motion");
  const rm = await browser.newPage();
  await rm.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await rm.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  for (const s of ["hearts", "newyear", "christmas", "airmail", "snow"]) {
    await rm.goto(BASE + s, { waitUntil: "networkidle0" });
    await rm.addStyleTag({ content: ".gft-a-band > :not(.gft-scene) { visibility: hidden !important; }" });
    await new Promise((r) => setTimeout(r, 2500));
    const live = await rm.$eval(".gft-scene-pat", (e) => e.hasAttribute("data-live"));
    const box = await (await rm.$("header.gft-a-band")).boundingBox();
    const clip = { x: box.x, y: box.y, width: Math.min(box.width, 390), height: Math.min(box.height, 520) };
    const a = await rm.screenshot({ clip, encoding: "base64" });
    await new Promise((r) => setTimeout(r, 600));
    const b = await rm.screenshot({ clip, encoding: "base64" });
    if (s === "hearts") fs.writeFileSync(path.join(SHOTS, `reduced-${s}.png`), Buffer.from(a, "base64"));
    const d = await diffPngs(util, "data:image/png;base64," + a, "data:image/png;base64," + b);
    console.log(`${s.padEnd(14)} data-live=${live} changed=${(d * 100).toFixed(3)}%`);
  }

  /* 4. Recording: the real page (envelope, heading) on a few scenes. */
  if (process.argv.includes("--video")) {
    const v = await browser.newPage();
    await v.setViewport({ width: 390, height: 700, deviceScaleFactor: 1 });
    const parts = [];
    for (const s of ["hearts", "newyear", "christmas", "daisies", "smileys", "sunburst", "confetti", "airmail", "thanksgiving", "night", "snow"]) {
      await v.goto(BASE + s, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 2500));
      const file = path.join(SHOTS, `rec-${s}.webm`);
      const rec = await v.screencast({ path: file });
      await new Promise((r) => setTimeout(r, 3000));
      await rec.stop();
      parts.push(file);
    }
    const list = path.join(SHOTS, "rec.txt");
    fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", path.join(DIR, "preview.mp4")]);
    console.log("video: tools/patterns/preview.mp4");
  }
  if (process.argv.includes("--snow")) {
    const v = await browser.newPage();
    await v.setViewport({ width: 390, height: 700, deviceScaleFactor: 2 });
    await v.goto(BASE + "snow", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1500));
    const file = path.join(SHOTS, "rec-snow-only.webm");
    const rec = await v.screencast({ path: file });
    await new Promise((r) => setTimeout(r, 8000));
    await rec.stop();
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", path.join(DIR, "preview-snow.mp4")]);
    console.log("video: tools/patterns/preview-snow.mp4");
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
