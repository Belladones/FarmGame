import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("active utility robot is a complete textured GLB with no external dependencies", () => {
  const bytes = readFileSync(
    new URL("../public/models/luma/utility-robot.glb", import.meta.url),
  );
  assert.equal(bytes.toString("ascii", 0, 4), "glTF");
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.toString("ascii", 16, 20), "JSON");
  const asset = JSON.parse(
    bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
  );
  for (const name of [
    "LumaHeadJoint",
    "LumaArmLeftJoint",
    "LumaArmRightJoint",
    "LumaLegLeftJoint",
    "LumaLegRightJoint",
  ]) {
    const joint = asset.nodes.find((n: { name: string }) => n.name === name);
    assert.ok(joint?.children?.length, `${name} must control real geometry`);
  }
  assert.ok(asset.meshes.length > 0);
  assert.ok(asset.meshes[0].primitives[0].attributes.TEXCOORD_0 !== undefined);
  assert.ok(asset.images.length >= 3);
  for (const image of asset.images) {
    assert.equal(image.uri, undefined);
    assert.equal(typeof image.bufferView, "number");
  }
  for (const buffer of asset.buffers) assert.equal(buffer.uri, undefined);
  const material = asset.materials[0];
  assert.ok(material.pbrMetallicRoughness.baseColorTexture);
  assert.ok(material.normalTexture);
  assert.ok(material.emissiveTexture);
});
