/* ══ THE PARENT'S PHOTO, MADE SMALL ON THEIR PHONE (Sam, 6 Nov 2026: "I think
   it'd be super cool if they could add an image too") ══════════════════════
   The photo never leaves the phone as it was taken. It's drawn onto a canvas
   at most PHOTO_EDGE pixels on its long side and saved as a JPEG, which:
     - keeps the upload small (a phone photo is 3–8 MB; this is ~150–300 KB);
     - drops everything but the pixels, so no location or camera data
       (EXIF) is ever sent;
     - turns an iPhone's HEIC into a JPEG every browser can show.
   createImageBitmap applies the photo's own rotation (imageOrientation
   "from-image"), so a portrait shot stays upright. */

export const PHOTO_EDGE = 1280;
/** The most the backend takes, as the data URL's length (docs/parents/API.md). */
export const PHOTO_MAX_CHARS = 1_500_000;

export class PhotoError extends Error {}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* Fall through: an <img> decodes what some browsers' bitmap can't. */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A JPEG data URL of `file`, at most PHOTO_EDGE on its long side. */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new PhotoError("That file isn’t a photo. Choose a JPEG, PNG or HEIC.");
  }
  let pic: ImageBitmap | HTMLImageElement;
  try {
    pic = await decode(file);
  } catch {
    throw new PhotoError("We couldn’t open that photo. Try another one.");
  }
  const w = "naturalWidth" in pic ? pic.naturalWidth : pic.width;
  const h = "naturalHeight" in pic ? pic.naturalHeight : pic.height;
  if (!w || !h) throw new PhotoError("We couldn’t open that photo. Try another one.");
  const scale = Math.min(1, PHOTO_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("We couldn’t open that photo. Try another one.");
  /* White under any transparency (a PNG), as a JPEG has none. */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(pic, 0, 0, canvas.width, canvas.height);
  if ("close" in pic) pic.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= PHOTO_MAX_CHARS) return url;
  }
  throw new PhotoError("That photo is too large. Try another one.");
}
