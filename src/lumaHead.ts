import { Shape } from "three";
// One rounded helmet outline drives the shell, OLED screen and account portraits.
const curves = [
  [0.33, -0.45, 0.5, -0.3, 0.5, -0.05],
  [0.5, 0.24, 0.31, 0.45, 0, 0.45],
  [-0.31, 0.45, -0.5, 0.24, -0.5, -0.05],
  [-0.5, -0.3, -0.33, -0.45, 0, -0.45],
] as const;
export const lumaHeadPath = `M 0 -.45 ${curves.map((c) => `C ${c.join(" ")}`).join(" ")} Z`;
export function createLumaHeadShape() {
  const shape = new Shape();
  shape.moveTo(0, 0.45);
  for (const [x1, y1, x2, y2, x, y] of curves)
    shape.bezierCurveTo(x1, -y1, x2, -y2, x, -y);
  shape.closePath();
  return shape;
}
