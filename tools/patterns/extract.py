"""Decode the gift scene tiles in src/styles/gift.css into tools/patterns/src/<scene>.svg (reference only)."""
import re, urllib.parse, pathlib, json
root = pathlib.Path(__file__).resolve().parents[2]
css = (root / "src/styles/gift.css").read_text()
out = root / "tools/patterns/src"; out.mkdir(exist_ok=True)
rule = re.compile(r'\.gft-a\[data-scene="(\w+)"\] \.gft-scene-pat,\s*\n\.scene-swatch\[data-scene="\1"\] \{\n(.*?)\n\}', re.S)
info = {}
for m in rule.finditer(css):
    scene, body = m.group(1), m.group(2)
    urls = re.findall(r'url\("data:image/svg\+xml,(.*?)"\)', body)
    info[scene] = {"body_without_urls": re.sub(r'url\("data:image/svg\+xml,.*?"\)', 'URL', body), "n": len(urls), "len": [len(u) for u in urls]}
    for i, u in enumerate(urls):
        (out / f"{scene}{'' if i == 0 else '-' + str(i)}.svg").write_text(urllib.parse.unquote(u))
print(json.dumps(info, indent=1))
