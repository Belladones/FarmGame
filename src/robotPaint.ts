import * as THREE from "three";
/** Only the yellow paint and the red lens pixels are replaced; metal, text and shading stay intact. */
export function robotPaint(material: THREE.MeshStandardMaterial) {
  const uniforms = {
    lumaLegendary: { value: 0 },
    lumaTime: { value: 0 },
    lumaShimmer: { value: 0 },
    lumaLegendAccent: { value: new THREE.Color("#ffd464") },
    lumaPaint: { value: new THREE.Color("#ed87b1") },
    lumaPaintEnabled: { value: 0 },
    lumaLens: { value: new THREE.Color("#36e3f5") },
    lumaLensEnabled: { value: 0 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader =
      `uniform float lumaTime;\nuniform float lumaShimmer;\nuniform float lumaLegendary;\nuniform vec3 lumaLegendAccent;\nuniform vec3 lumaPaint;\nuniform float lumaPaintEnabled;\nuniform vec3 lumaLens;\nuniform float lumaLensEnabled;\n` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
float lumaLensMask = 0.0;
float lumaNeon = 0.0;
#ifdef USE_MAP
vec3 lumaBase = diffuseColor.rgb;
float lumaR = max(lumaBase.r, 0.0001);
float lumaG = max(lumaBase.g, 0.0001);
float lumaYellow = smoothstep(0.2, 0.5, (lumaBase.r - lumaBase.b) / lumaR)
 * smoothstep(0.2, 0.5, (lumaBase.g - lumaBase.b) / lumaG)
 * smoothstep(0.12, 0.3, lumaBase.g / lumaR)
 * smoothstep(0.7, 0.95, lumaBase.r / lumaG);
float lumaShade = dot(lumaBase, vec3(0.2126, 0.7152, 0.0722)) / 0.58;
vec3 lumaCoat = lumaPaint * lumaShade;
if (lumaLegendary > 0.5) {
  if(lumaLegendary < 1.5) lumaCoat = lumaPaint * mix(lumaShade, sqrt(max(lumaShade,0.0)),0.65);
  float trim = 1.0 - smoothstep(0.16, 0.43, lumaShade);
  lumaCoat = mix(lumaCoat, lumaLegendAccent * (0.5 + lumaShade), trim * 0.85);
  lumaNeon = lumaYellow * (1.0 - smoothstep(0.0, 0.045, abs(lumaShade - 0.3))) * 0.22;
  float sheen = fract(vMapUv.x + vMapUv.y * 0.7 - lumaTime * 0.08);
  lumaNeon += lumaYellow * lumaShimmer * (1.0 - smoothstep(0.0,0.018,abs(sheen - 0.5))) * 0.12;
}
diffuseColor.rgb = mix(lumaBase, lumaCoat, lumaYellow * lumaPaintEnabled);
float lumaLensRegion = step(abs(vMapUv.x - 0.225), 0.08)
 * max(step(abs(vMapUv.y - 0.6), 0.08), step(abs(vMapUv.y - 0.4), 0.08));
lumaLensMask = lumaLensRegion * smoothstep(0.35, 0.65, (lumaBase.r - lumaBase.g) / lumaR)
 * smoothstep(0.2, 0.5, (lumaBase.r - lumaBase.b) / lumaR) * lumaLensEnabled;
diffuseColor.rgb = mix(diffuseColor.rgb, lumaLens * lumaBase.r, lumaLensMask);
#endif
totalEmissiveRadiance += lumaLegendAccent * lumaNeon;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
#ifdef USE_EMISSIVEMAP
float lumaLight = max(totalEmissiveRadiance.r, max(totalEmissiveRadiance.g, totalEmissiveRadiance.b));
totalEmissiveRadiance = mix(totalEmissiveRadiance, lumaLens * lumaLight, lumaLensMask);
#endif
totalEmissiveRadiance += lumaLegendAccent * lumaNeon;`,
    );
  };
  material.customProgramCacheKey = () => "luma-selective-paint-v2";
  material.needsUpdate = true;
  return uniforms;
}
