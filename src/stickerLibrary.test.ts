import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stickerLibrary, stickerAtlas } from "./modules/companion/domain/stickerLibrary";
import { fresh, hydrateFarm } from "./modules/farm/application/engine";
import { customizeCompanion } from "./modules/companion/domain/companion";
test("all 35 sticker crops belong to the supplied transparent atlas", () => {
  const png = readFileSync(
    new URL("../public/models/luma/stickers/atlas.png", import.meta.url),
  );
  assert.equal(png.readUInt32BE(16), stickerAtlas.width);
  assert.equal(png.readUInt32BE(20), stickerAtlas.height);
  assert.equal(png[25], 6, "atlas must retain its alpha channel");
  assert.equal(stickerLibrary.length, 35);
  assert.equal(new Set(stickerLibrary.map((s) => s.id)).size, 35);
  for (const sticker of stickerLibrary) {
    const [x, y, w, h] = sticker.rect;
    assert.ok(
      x >= 0 &&
        y >= 0 &&
        w > 0 &&
        h > 0 &&
        x + w <= stickerAtlas.width &&
        y + h <= stickerAtlas.height,
    );
  }
});
test("sheet stickers can be mixed up to the limit and keep their saved placements", () => {
  const farm = fresh();
  assert.ok(customizeCompanion(farm, "none"));
  for (const id of ["sticker-meowth", "sticker-rockruff", "sticker-popplio"])
    assert.ok(customizeCompanion(farm, id));
  assert.equal(customizeCompanion(farm, "sticker-jar"), false);
  const placements = structuredClone(farm.companion.stickers);
  assert.deepEqual(
    hydrateFarm(JSON.parse(JSON.stringify(farm))).companion.stickers,
    placements,
  );
  assert.ok(customizeCompanion(farm, `sticker:remove:${placements![0].slot}`));
  assert.ok(customizeCompanion(farm, "sticker-jar"));
});
