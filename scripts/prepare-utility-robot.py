"""Convert the supplied utility-robot archive (extracted) to a self-contained GLB.
Usage: blender --background --python scripts/prepare-utility-robot.py -- EXTRACTED_DIR OUTPUT.glb
The nested source zip must first be extracted to EXTRACTED_DIR/mesh.
"""
import bpy
import os
import sys

source, output = sys.argv[sys.argv.index("--") + 1:]
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=os.path.join(source, "mesh", "Utility_Robot.obj"), forward_axis="NEGATIVE_Z", up_axis="Y")
material = bpy.data.materials.new("Utility Robot · supplied textures")
material.use_nodes = True
nodes = material.node_tree.nodes
links = material.node_tree.links
shader = nodes.get("Principled BSDF")
shader.inputs["Metallic"].default_value = 0.15
shader.inputs["Roughness"].default_value = 0.65
for suffix, socket in [("DF", "Base Color"), ("EM", "Emission Color"), ("NM", None)]:
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(os.path.join(source, "textures", "_Midterm_Robot_" + suffix + ".jpg"))
    if suffix == "NM":
        texture.image.colorspace_settings.name = "Non-Color"
        normal = nodes.new("ShaderNodeNormalMap")
        links.new(texture.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], shader.inputs["Normal"])
    else:
        links.new(texture.outputs["Color"], shader.inputs[socket])
shader.inputs["Emission Strength"].default_value = 0.7
for obj in bpy.context.scene.objects:
    if obj.type == "MESH":
        obj.data.materials.clear()
        obj.data.materials.append(material)
        obj.name = "Utility Robot"
os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", export_yup=True)
