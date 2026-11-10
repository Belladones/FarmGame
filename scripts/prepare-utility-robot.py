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
# The OBJ has disconnected rigid components. Preserve their faces/UVs and give
# them parent pivots instead of bending or regenerating the supplied mesh.
bpy.ops.object.select_all(action="DESELECT")
robot = next(o for o in bpy.context.scene.objects if o.type == "MESH")
robot.select_set(True)
bpy.context.view_layer.objects.active = robot
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.separate(type="LOOSE")
bpy.ops.object.mode_set(mode="OBJECT")
parts = [o for o in bpy.context.scene.objects if o.type == "MESH"]
joints = {}
for name, position in {
    "LumaHeadJoint": (0, 0, 7.4),
    "LumaArmLeftJoint": (-13, -10, 7),
    "LumaArmRightJoint": (13, -10, 7),
    "LumaLegLeftJoint": (-8, -2, 2),
    "LumaLegRightJoint": (8, -2, 2),
}.items():
    joint = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(joint)
    joint.location = position
    joints[name] = joint
bpy.context.view_layer.update()
for part in parts:
    positions = [part.matrix_world @ v.co for v in part.data.vertices]
    minimum = [min(v[i] for v in positions) for i in range(3)]
    maximum = [max(v[i] for v in positions) for i in range(3)]
    side = "Left" if (minimum[0] + maximum[0]) < 0 else "Right"
    joint = None
    if minimum[2] > 6:
        joint = joints["LumaHeadJoint"]
    elif minimum[0] > 12 or maximum[0] < -12:
        # Lowest disconnected components are the feet, not the claws.
        kind = "Leg" if maximum[2] < -8 else "Arm"
        joint = joints["Luma" + kind + side + "Joint"]
    elif minimum[0] > 5 or maximum[0] < -5:
        joint = joints["LumaLeg" + side + "Joint"]
    if joint:
        world = part.matrix_world.copy()
        part.parent = joint
        part.matrix_world = world
os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", export_yup=True)
