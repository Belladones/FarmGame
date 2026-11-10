import * as THREE from "three";
import { stickerContours } from "../../domain/stickerContours";
export function stickerContourMask(id: string) {
  const polygon = stickerContours[id];
  if (!polygon) return undefined;
  const size = 128,
    pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const x = (col + 0.5) / size,
        y = 1 - (row + 0.5) / size;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i],
          [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
          inside = !inside;
      }
      pixels.set(
        [inside ? 255 : 0, inside ? 255 : 0, inside ? 255 : 0, 255],
        (row * size + col) * 4,
      );
    }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
