# Christ the Redeemer — 3D asset conversion

## Conversion work

Source asset: binary STL, 186,966 triangles, Z-up coordinates, faceted surfaces,
and no material.

1. Welded 93,483 vertices to support smooth shading.
2. Converted Z-up to Y-up, the glTF and Three.js convention.
3. Scaled the sculpture to a 30 m height.
4. Placed the base on Y=0 and centered it on X/Z for the scene origin.
5. Applied a soapstone PBR material: `#D1D1CC`, metallic `0`, roughness `0.92`.
6. Recalculated smooth normals.

At 30 m tall, the converted model spans 28.81 m. The monument spans about 28 m;
the 3% difference is attributable to the source model's proportions.

## Files

| file | triangles | size | intended use |
|---|---:|---:|---|
| `cristo-full.glb` | 186,966 | 4.3 MB | Blender, Unreal, or offline rendering |
| `cristo-web.glb` | 70,000 | 1.7 MB | Three.js without an extra decoder |
| `cristo-web-opt.glb` | 54,136 | 144 KB | production web delivery; requires `DRACOLoader` |

`cristo-web-opt.glb` uses `KHR_draco_mesh_compression`. Without a configured
`DRACOLoader`, use `cristo-web.glb` instead.
