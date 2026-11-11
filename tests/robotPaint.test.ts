import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { robotPaint } from "../src/modules/companion/adapters/three/robotPaint";
test("selective paint and lens uniforms update without rewriting source maps or tinting all parts", () => {
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
  });
  const uniforms = robotPaint(material);
  const shader = {
    uniforms: {},
    fragmentShader: "#include <map_fragment>\n#include <emissivemap_fragment>",
  };
  material.onBeforeCompile(shader as never, null as never);
  assert.equal(
    (shader.uniforms as typeof uniforms).lumaPaint,
    uniforms.lumaPaint,
  );
  uniforms.lumaPaintEnabled.value = 1;
  uniforms.lumaPaint.value.set("#ed87b1");
  uniforms.lumaLensEnabled.value = 1;
  uniforms.lumaLens.value.set("#36e3f5");
  assert.equal(material.map, texture);
  assert.equal(material.color.getHex(), 0xffffff);
  assert.match(shader.fragmentShader, /lumaYellow/);
  assert.match(shader.fragmentShader, /lumaLensRegion/);
  material.dispose();
  texture.dispose();
});
