export interface GuiRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const intersects = (a: GuiRect, b: GuiRect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
export function guiSpots(
  width: number,
  height: number,
  size: { width: number; height: number },
  obstacles: GuiRect[],
) {
  const spots: GuiRect[] = [];
  for (let y = 12; y + size.height <= height - 12; y += 32)
    for (let x = 12; x + size.width <= width - 12; x += 32) {
      if (
        x > width * 0.2 &&
        x + size.width < width * 0.8 &&
        y > height * 0.28 &&
        y + size.height < height * 0.78
      )
        continue;
      const rect = { x, y, ...size };
      if (!obstacles.some((o) => intersects(rect, o))) spots.push(rect);
    }
  return spots;
}
export function guiPathClear(from: GuiRect, to: GuiRect, obstacles: GuiRect[]) {
  for (let t = 0; t <= 1; t += 0.05)
    if (
      obstacles.some((o) =>
        intersects(
          {
            ...from,
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
          },
          o,
        ),
      )
    )
      return false;
  return true;
}
