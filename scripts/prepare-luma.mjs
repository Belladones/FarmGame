import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const source = resolve(process.argv[2] || "public/models/luma/source.gltf"),
  directory = dirname(source);
const doc = JSON.parse(await readFile(source, "utf8"));
for (const buffer of doc.buffers ?? []) {
  const file = resolve(directory, buffer.uri);
  if (!file.startsWith(directory + "/"))
    throw new Error("Buffer outside asset directory");
  if ((await stat(file)).size !== buffer.byteLength)
    throw new Error(`Invalid buffer length: ${buffer.uri}`);
}
const missing = [];
for (const image of doc.images ?? []) {
  try {
    await stat(resolve(directory, image.uri));
  } catch {
    missing.push(image.uri);
  }
}
// Keep the exact user mesh and UVs. Only unavailable texture slots are omitted.
const available = (index) =>
  !missing.includes(doc.images[doc.textures[index].source].uri);
for (const material of doc.materials ?? []) {
  if (material.normalTexture && !available(material.normalTexture.index))
    delete material.normalTexture;
  const pbr = (material.pbrMetallicRoughness ??= {});
  if (pbr.baseColorTexture && !available(pbr.baseColorTexture.index))
    delete pbr.baseColorTexture;
  if (
    pbr.metallicRoughnessTexture &&
    !available(pbr.metallicRoughnessTexture.index)
  )
    delete pbr.metallicRoughnessTexture;
  if (!pbr.baseColorTexture) pbr.baseColorFactor = [0.92, 0.94, 1, 1];
  if (!pbr.metallicRoughnessTexture) {
    pbr.metallicFactor = 0.22;
    pbr.roughnessFactor = 0.48;
  }
}
doc.extras = {
  source: "User-provided cyber.gltf and cyber.bin",
  missingTextures: missing,
  hasRig: !!doc.skins?.length,
  hasAnimations: !!doc.animations?.length,
};
await writeFile(
  resolve(directory, "cyber.gltf"),
  JSON.stringify(doc, null, 2) + "\n",
);
console.log(
  `Luma: exact source mesh prepared; ${missing.length ? `textures pending: ${missing.join(", ")}` : "all textures available"}`,
);
