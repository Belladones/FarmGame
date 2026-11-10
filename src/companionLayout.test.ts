import { test } from "node:test";
import assert from "node:assert/strict";
import { guiSpots, guiPathClear, intersects } from "./modules/companion/domain/companionLayout";
test("GUI destinations stay on screen and avoid panels at desktop and mobile sizes", () => {
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
    [320, 740],
  ]) {
    const size =
      width < 700 ? { width: 64, height: 96 } : { width: 96, height: 144 };
    const obstacles = [
      { x: 0, y: 0, width, height: 190 },
      { x: 0, y: height - 180, width, height: 180 },
    ];
    const spots = guiSpots(width, height, size, obstacles);
    assert.ok(spots.length);
    for (const s of spots) {
      assert.ok(
        s.x >= 0 &&
          s.y >= 0 &&
          s.x + s.width <= width &&
          s.y + s.height <= height,
      );
      assert.ok(!obstacles.some((o) => intersects(s, o)));
    }
  }
});
test("GUI routes cannot pass through a panel even when both endpoints are free", () => {
  const from = { x: 0, y: 0, width: 20, height: 20 },
    to = { ...from, x: 150 };
  assert.equal(
    guiPathClear(from, to, [{ x: 60, y: 0, width: 20, height: 100 }]),
    false,
  );
  assert.equal(
    guiPathClear(from, to, [{ x: 60, y: 40, width: 20, height: 100 }]),
    true,
  );
  assert.deepEqual(
    guiSpots(390, 844, { width: 64, height: 96 }, [
      { x: 0, y: 0, width: 390, height: 844 },
    ]),
    [],
  );
});
