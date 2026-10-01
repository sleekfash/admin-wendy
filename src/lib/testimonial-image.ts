export const TESTIMONIAL_OUTPUT_WIDTH = 1080;
export const TESTIMONIAL_OUTPUT_HEIGHT = 1080;
export const TESTIMONIAL_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const TESTIMONIAL_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type TransformOptions = {
  customerLabel: string;
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That image could not be opened."));
    };
    image.src = url;
  });
}

/**
 * Recolours neutral near-black chat backgrounds to the brand's cocoa/rose
 * surface while preserving message text, coloured bubbles and photographs.
 */
function recolourDarkChatBackground(source: HTMLImageElement): HTMLCanvasElement {
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Image editing is not available in this browser.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i] ?? 0;
    const g = pixels.data[i + 1] ?? 0;
    const b = pixels.data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Only alter neutral, dark pixels. This avoids recolouring green/blue chat
    // bubbles and keeps white message text intact.
    if (luminance < 74 && max - min < 28) {
      const lift = luminance / 74;
      pixels.data[i] = Math.round(43 + lift * 28);
      pixels.data[i + 1] = Math.round(25 + lift * 19);
      pixels.data[i + 2] = Math.round(34 + lift * 25);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

export async function transformTestimonialImage(
  file: File,
  options: TransformOptions,
): Promise<Blob> {
  if (!TESTIMONIAL_SOURCE_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (file.size > TESTIMONIAL_MAX_SOURCE_BYTES) {
    throw new Error("That screenshot is larger than 12MB. Choose a smaller image.");
  }

  const source = await loadImage(file);
  if (source.naturalWidth * source.naturalHeight > 40_000_000) {
    throw new Error("That screenshot has unusually large dimensions. Choose a smaller image.");
  }
  const cleaned = recolourDarkChatBackground(source);
  const canvas = document.createElement("canvas");
  canvas.width = TESTIMONIAL_OUTPUT_WIDTH;
  canvas.height = TESTIMONIAL_OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editing is not available in this browser.");

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#fff8f4");
  background.addColorStop(0.58, "#f8e2e2");
  background.addColorStop(1, "#edc6cc");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(192, 137, 54, 0.18)";
  ctx.beginPath();
  ctx.arc(72, 92, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1040, 1000, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#b9872f";
  ctx.font = "600 34px Georgia, serif";
  ctx.fillText("★  ★  ★  ★  ★", canvas.width / 2, 70);
  ctx.fillStyle = "#2c1a1f";
  ctx.font = "700 72px Georgia, serif";
  ctx.fillText("CUSTOMER", canvas.width / 2, 145);
  ctx.fillStyle = "#c74870";
  ctx.font = "italic 68px Georgia, serif";
  ctx.fillText("Review", canvas.width / 2, 208);
  ctx.fillStyle = "#66444f";
  ctx.font = "600 20px Arial, sans-serif";
  ctx.fillText("REAL FEEDBACK. REAL LOVE.", canvas.width / 2, 248);

  const frameX = 82;
  const frameY = 280;
  const frameWidth = 916;
  const frameHeight = 610;
  ctx.save();
  ctx.shadowColor = "rgba(64, 28, 39, 0.24)";
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, frameX, frameY, frameWidth, frameHeight, 42);
  ctx.fillStyle = "#fffaf7";
  ctx.fill();
  ctx.restore();

  const inset = 24;
  const imageX = frameX + inset;
  const imageY = frameY + inset;
  const imageWidth = frameWidth - inset * 2;
  const imageHeight = frameHeight - inset * 2;
  const sourceRatio = cleaned.width / cleaned.height;
  const targetRatio = imageWidth / imageHeight;
  let drawWidth = imageWidth;
  let drawHeight = imageHeight;
  if (sourceRatio > targetRatio) drawHeight = imageWidth / sourceRatio;
  else drawWidth = imageHeight * sourceRatio;
  const drawX = imageX + (imageWidth - drawWidth) / 2;
  const drawY = imageY + (imageHeight - drawHeight) / 2;

  ctx.save();
  roundedRect(ctx, imageX, imageY, imageWidth, imageHeight, 28);
  ctx.clip();
  ctx.fillStyle = "#f1d9dc";
  ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
  ctx.drawImage(cleaned, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#c74870";
  ctx.font = "italic 46px Georgia, serif";
  ctx.fillText("Absolutely loved!", canvas.width / 2, 945);
  ctx.fillStyle = "#2c1a1f";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText("Wendy’s Bakehouse", canvas.width / 2, 990);
  ctx.fillStyle = "#6d5058";
  ctx.font = "500 21px Arial, sans-serif";
  const customerLabel = options.customerLabel.trim() || "Verified customer feedback";
  ctx.fillText(customerLabel.slice(0, 64), canvas.width / 2, 1025);
  ctx.fillStyle = "#b9872f";
  ctx.fillRect(390, 1048, 300, 3);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare the review image."))),
      "image/jpeg",
      0.9,
    );
  });
}
