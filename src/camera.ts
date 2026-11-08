export const cameraInclination = { min: 0.55, max: 1.05 };
// A rotation-independent bounding sphere avoids refitting or stretching axes while orbiting.
export function farmViewport(
  width: number,
  height: number,
  spanX: number,
  spanZ: number,
  editorOpen: boolean,
) {
  const desktop = width > 1000;
  const left = desktop ? 398 : width * 0.06;
  const right = desktop ? width - (editorOpen ? 466 : 29) : width * 0.94;
  const usable = Math.max(width * 0.18, right - left);
  const center = desktop ? (left + right) / 2 : width / 2;
  const radius = Math.hypot(spanX / 2, spanZ / 2, 1.6);
  const extent = Math.max(3.1, radius * 1.15, (radius * height) / usable);
  const aspect = width / height;
  return {
    left: -extent * aspect,
    right: extent * aspect,
    top: extent,
    bottom: -extent,
    offsetX: width / 2 - center,
    offsetY: desktop ? 0 : -height * 0.015,
  };
}
