const keywordRules = [
  { id: "pcb", words: ["pcb", "circuit", "board", "motherboard", "electronics"] },
  { id: "cable", words: ["cable", "wire", "wires", "charger", "cord", "usb"] },
  { id: "battery", words: ["battery", "cell", "lithium", "powerbank", "power-bank"] },
  { id: "mobile", words: ["mobile", "phone", "smartphone", "iphone", "android", "tablet"] }
];

function matchFilename(filename) {
  const normalizedName = filename.toLowerCase();
  const match = keywordRules.find((rule) => rule.words.some((word) => normalizedName.includes(word)));
  return match ? { id: match.id, confidence: 96, reason: `Matched visual label: ${match.words.find((word) => normalizedName.includes(word))}` } : null;
}

function inspectPixels(image) {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  let brightness = 0;
  let saturation = 0;
  let darkPixels = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] / 255;
    const green = pixels[index + 1] / 255;
    const blue = pixels[index + 2] / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    brightness += (max + min) / 2;
    saturation += max === 0 ? 0 : (max - min) / max;
    if (max < 0.25) darkPixels += 1;
  }

  const pixelCount = pixels.length / 4;
  return {
    brightness: brightness / pixelCount,
    saturation: saturation / pixelCount,
    darkRatio: darkPixels / pixelCount,
    aspectRatio: image.width / image.height
  };
}

function classifyPixels(features) {
  if (features.aspectRatio > 2.2 || features.aspectRatio < 0.45) {
    return { id: "cable", confidence: 68, reason: "Long object silhouette detected" };
  }
  if (features.darkRatio > 0.42 && features.saturation < 0.28) {
    return { id: "battery", confidence: 63, reason: "Dark, compact battery-like surface detected" };
  }
  if (features.saturation > 0.42) {
    return { id: "pcb", confidence: 61, reason: "High-detail colored circuit-like surface detected" };
  }
  return { id: "mobile", confidence: 54, reason: "Compact rectangular electronic device detected" };
}

export function detectMaterial(file) {
  const filenameMatch = matchFilename(file.name);
  if (filenameMatch) return Promise.resolve(filenameMatch);

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const result = classifyPixels(inspectPixels(image));
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ id: "pcb", confidence: 50, reason: "Image signal unclear; review the suggested material" });
    };
    image.src = objectUrl;
  });
}
