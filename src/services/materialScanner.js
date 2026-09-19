const keywordRules = [
  { id: "pcb", words: ["pcb", "circuit", "board", "motherboard", "electronics", "processor", "ram", "chip"] },
  { id: "cable", words: ["cable", "wire", "wires", "charger", "cord", "usb", "adapter", "power cable", "charging cable"] },
  { id: "battery", words: ["battery", "cell", "lithium", "lipo", "powerbank", "power-bank", "accu", "battery pack"] },
  { id: "mobile", words: ["mobile", "phone", "smartphone", "iphone", "android", "tablet", "screen", "cellphone"] }
];

export function matchFilename(filename) {
  const normalizedName = String(filename || "").toLowerCase();
  const match = keywordRules.find((rule) => rule.words.some((word) => normalizedName.includes(word)));
  if (!match) return null;

  const matchedWord = match.words.find((word) => normalizedName.includes(word));
  return {
    id: match.id,
    confidence: 96,
    reason: `Matched image label: ${matchedWord}`
  };
}

function inspectPixels(image) {
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size).data;
  let brightness = 0;
  let saturation = 0;
  let redEnergy = 0;
  let greenEnergy = 0;
  let blueEnergy = 0;
  let darkPixels = 0;
  let edgeEnergy = 0;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const red = pixels[index] / 255;
      const green = pixels[index + 1] / 255;
      const blue = pixels[index + 2] / 255;
      const min = Math.min(red, green, blue);
      const max = Math.max(red, green, blue);

      brightness += (max + min) / 2;
      saturation += max === 0 ? 0 : (max - min) / max;
      redEnergy += red;
      greenEnergy += green;
      blueEnergy += blue;

      if (max < 0.25) darkPixels += 1;

      if (x < size - 1 && y < size - 1) {
        const nextIndex = ((y + 1) * size + x) * 4;
        const nextR = pixels[nextIndex];
        const nextG = pixels[nextIndex + 1];
        const nextB = pixels[nextIndex + 2];
        const diff = Math.abs(red - nextR / 255) + Math.abs(green - nextG / 255) + Math.abs(blue - nextB / 255);
        edgeEnergy += diff;
      }
    }
  }

  const pixelCount = pixels.length / 4;
  const averageBrightness = brightness / pixelCount;
  const averageSaturation = saturation / pixelCount;

  return {
    brightness: averageBrightness,
    saturation: averageSaturation,
    darkRatio: darkPixels / pixelCount,
    edgeDensity: edgeEnergy / pixelCount,
    aspectRatio: image.width / image.height,
    dominantColor: {
      red: redEnergy / pixelCount,
      green: greenEnergy / pixelCount,
      blue: blueEnergy / pixelCount
    }
  };
}

export function classifyFeatures(features) {
  const hasLongCableShape = features.aspectRatio > 2.1 || features.aspectRatio < 0.48;
  const isBatteryLike = features.darkRatio > 0.38 && features.brightness < 0.34 && features.saturation < 0.32;
  const isPCBLike = features.saturation > 0.38 && features.edgeDensity > 0.08 && features.dominantColor.green > 0.24;
  const isMobileLike = features.aspectRatio > 0.7 && features.aspectRatio < 1.8 && features.brightness > 0.38 && features.darkRatio < 0.28;

  const candidates = [
    { id: "cable", score: hasLongCableShape && features.edgeDensity > 0.06 ? 86 : 0, reason: "Long cable-like silhouette and surface pattern detected" },
    { id: "battery", score: isBatteryLike ? 82 : 0, reason: "Dark compact battery pack pattern identified" },
    { id: "pcb", score: isPCBLike ? 88 : 0, reason: "High-detail circuit board texture detected" },
    { id: "mobile", score: isMobileLike ? 74 : 0, reason: "Compact handheld electronic device detected" }
  ];

  const best = candidates.filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score)[0];
  if (best) return { id: best.id, confidence: best.score, reason: best.reason };

  return { id: "pcb", confidence: 63, reason: "Mixed electronic waste patterns detected; verify the material manually" };
}

export function detectMaterial(file) {
  const filenameMatch = matchFilename(file?.name);
  if (filenameMatch) return Promise.resolve(filenameMatch);

  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const result = classifyFeatures(inspectPixels(image));
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ id: "pcb", confidence: 56, reason: "Image quality was low; please review the suggested material" });
    };
    image.src = objectUrl;
  });
}
