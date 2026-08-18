# Cristo Redentor — asset 3D

## O que foi feito na conversão

Original: STL binário, 186.966 triângulos, Z-up, facetado, sem material.

1. Vértices soldados (93.483) — habilita sombreamento suave de verdade
2. Rotação Z-up → Y-up (padrão glTF/three.js)
3. Escala para metros reais: 30 m de altura
4. Base apoiada em Y=0, centrado em X/Z — entra na cena na origem, de pé
5. Material PBR de esteatita: baseColor #D1D1CC, metallic 0, roughness 0.92
6. Normais suaves recalculadas

**Aferição de escala:** com 30 m de altura, a envergadura deu **28,81 m**.
O monumento real tem 28 m de envergadura — 3% de diferença. A proporção
do modelo confere.

## Arquivos

| arquivo | triângulos | tamanho | quando usar |
|---|---|---|---|
| `cristo-full.glb` | 186.966 | 4,3 MB | Blender / Unreal / render offline |
| `cristo-web.glb` | 70.000 | 1,7 MB | three.js sem dependência extra |
| `cristo-web-opt.glb` | 54.136 | **144 KB** | web em produção — exige DracoLoader |

A versão `-opt` usa `KHR_draco_mesh_compression`. No three.js:

```js
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');        // copie three/examples/jsm/libs/draco/
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
```

Sem o DRACOLoader configurado, esse arquivo não carrega — use o `cristo-web.glb`.
