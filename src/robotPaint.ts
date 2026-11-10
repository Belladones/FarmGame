import * as THREE from "three";
/** Only the yellow paint and the red lens pixels are replaced; metal, text and shading stay intact. */
export function robotPaint(material: THREE.MeshStandardMaterial) {
  const uniforms = {
    lumaPaint: { value: new THREE.Color("#ed87b1") },
    lumaPaintEnabled: { value: 0 },
    lumaLens: { value: new THREE.Color("#36e3f5") },
    lumaLensEnabled: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader =
      `uniform vec3 lumaPaint;\nuniform float lumaPaintEnabled;\nuniform vec3 lumaLens;\nuniform float lumaLensEnabled;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
float lumaLensMask = 0.0;
#ifdef USE_MAP
vec3 lumaBase = diffuseColor.rgb;
float lumaR = max(lumaBase.r, 0.0001);
float lumaG = max(lumaBase.g, 0.0001);
float lumaYellow = smoothstep(0.2, 0.5, (lumaBase.r - lumaBase.b) / lumaR)
 * smoothstep(0.2, 0.5, (lumaBase.g - lumaBase.b) / lumaG)
 * smoothstep(0.12, 0.3, lumaBase.g / lumaR)
 * smoothstep(0.7, 0.95, lumaBase.r / lumaG);
float lumaShade = dot(lumaBase, vec3(0.2126, 0.7152, 0.0722)) / 0.58;
diffuseColor.rgb = mix(lumaBase, lumaPaint * lumaShade, lumaYellow * lumaPaintEnabled);
float lumaLensRegion = step(abs(vMapUv.x - 0.225), 0.08)
 * max(step(abs(vMapUv.y - 0.6), 0.08), step(abs(vMapUv.y - 0.4), 0.08));
lumaLensMask = lumaLensRegion * smoothstep(0.35, 0.65, (lumaBase.r - lumaBase.g) / lumaR)
 * smoothstep(0.2, 0.5, (lumaBase.r - lumaBase.b) / lumaR) * lumaLensEnabled;
diffuseColor.rgb = mix(diffuseColor.rgb, lumaLens * lumaBase.r, lumaLensMask);
#endif`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
#ifdef USE_EMISSIVEMAP
float lumaLight = max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b));
totalEmissiveRadiance = mix(totalEmissiveRadiance, lumaLens * lumaLight, lumaLensMask);
#endif`,
    );
  };
  material.customProgramCacheKey = () => "luma-selective-paint-v1";
  material.needsUpdate = true;
  return uniforms;
}
