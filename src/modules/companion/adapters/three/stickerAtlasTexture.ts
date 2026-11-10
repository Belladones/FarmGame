import * as THREE from "three";
import { stickerAtlas } from "../../domain/stickerLibrary";
let pending: Promise<THREE.Texture> | undefined;
export function loadStickerAtlas() {
  pending ??= new THREE.TextureLoader()
    .loadAsync(stickerAtlas.url)
    .then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })
    .catch((error) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
