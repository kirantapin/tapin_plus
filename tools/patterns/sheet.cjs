/* Contact sheet of the check's frames: node tools/patterns/sheet.cjs (after check.cjs). */
const puppeteer = require("/Users/samuelwhite/.npm/_npx/fd355c6121ed2f2b/node_modules/puppeteer");
const fs = require("fs"), path = require("path");
const S = path.join(__dirname, "shots");
const scenes = fs.readdirSync(S).filter((f) => f.endsWith("-a.png")).map((f) => f.slice(0, -6)).sort();
const img = (f) => "data:image/png;base64," + fs.readFileSync(path.join(S, f)).toString("base64");
const cell = (s) => `<figure><img src="${img(s + "-a.png")}"><figcaption>${s}</figcaption></figure>`;
const html = `<style>body{margin:0;padding:12px;background:#222;font:600 14px system-ui;color:#eee;display:grid;grid-template-columns:repeat(5,195px);gap:10px}
figure{margin:0}img{width:195px;height:260px;object-fit:cover;display:block;border-radius:6px}figcaption{padding:4px 0}</style>${scenes.map(cell).join("")}`;
(async () => {
  const b = await puppeteer.launch({ headless: "shell", args: ["--disable-gpu"] });
  const p = await b.newPage(); await p.setViewport({ width: 1040, height: 400 });
  await p.setContent(html); await p.screenshot({ path: path.join(__dirname, "sheet.png"), fullPage: true });
  await b.close();
})();
