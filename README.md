# Cristo Redentor · cena three.js

**▶ Ao vivo: https://victorsodre.github.io/cristo-redentor-threejs/**

Abra, arraste para girar, mexa no relógio — ou aperte **☀ ciclo** e veja o dia
inteiro passar em 24 segundos.

Página única, autocontida, do Cristo Redentor no alto do Corcovado. Órbita com
o mouse ou o dedo, controle de hora do dia de 0 a 24 h, **modo ciclo** (giro
ligado e a hora andando 1 h por segundo — o dia inteiro em 24 s), HUD de
desempenho à vista e link profundo: quem compartilha a URL entrega exatamente a
vista que estava vendo.

Sem framework, sem bundler, sem CDN. Só three.js vendorizado em `public/vendor/`.

---

## Como rodar

Para **ver a cena** não é preciso instalar nada — o three.js já está vendorizado
em `public/vendor/` e o servidor não tem dependência:

```bash
node scripts/serve.mjs        # http://127.0.0.1:5173
```

São 100 linhas de `node:http` com gzip nos arquivos de texto e MIME correto para
`.glb` e `.wasm`. Sem servidor, abrir o `index.html` por `file://` não funciona:
módulo ES e WASM exigem HTTP.

Para **aferir** (e só para isso) é preciso o Playwright:

```bash
npm install                   # playwright, e o three usado para revendorizar
```

### Aferir

```bash
node scripts/capture.mjs --round=r3    # 6 capturas + marcos de hora + fps + rede
node scripts/test-ui.mjs  --round=r3   # controles, auto-rotate, link, toque, aba oculta
```

Saem em `shots/<rodada>/`: os seis ângulos fixos, as folhas de comparação lado a
lado com as referências de `ref/`, a grade dos quatro marcos de hora, recortes a
200 % para inspeção de borda, `metrics.json` e `test-ui.json`. O histórico das
rodadas, com pontuação item a item, está em `GAUNTLET.md`.

A captura aceita fases: `--only=shots`, `--only=marcos`, `--only=fps`,
`--only=rede`. Cada ângulo abre e fecha o próprio browser — nunca dois headless
ao mesmo tempo, que brigariam pela GPU e falseariam o fps.

---

## Desempenho medido

Medido em iMac Pro 2017 (Xeon W-2140B 8c/16t, 32 GB, Radeon Pro Vega 56),
Chromium 1228 headless com GPU real (`ANGLE Metal · Radeon Pro Vega 56`),
1920×1080, DPR 1. Números da rodada final — nada aqui é estimativa.

| alvo | medido | resultado |
|---|---|---|
| fps ≥ 55 @1920×1080, sem estrangulamento | **144,3 fps** média em 10 s de auto-rotate · frame mediano **3,10 ms** · p95 14,50 ms | atingido |
| fps ≥ 30 com CPU estrangulada 4× | **142,9 fps** · frame mediano 3,40 ms | atingido |
| primeiro frame < 2 s em 4G rápido, cache frio | **918 ms** o primeiro frame · **1256 ms** com a estátua (mediana de 3: 1256 / 1225 / 1374) | atingido |
| total transferido < 1,5 MB | **0,472 MB** (495.301 bytes, gzip) | atingido |
| draw calls < 30 | **11** | atingido |
| — | 93.672 triângulos por frame | — |
| modo ciclo ligado (giro + hora a 1 h/s) | **126,7 fps** média · frame mediano 3,10 ms · p95 16,30 ms | acima do alvo |

No modo ciclo o sol muda o tempo todo, então o mapa de sombra é refeito a cada
0,15 h de sol (~7 vezes por segundo, não a cada frame). O custo aparece na cauda
— p95 de 14,50 → 16,30 ms — e as draw calls sobem de 11 para 14 nos frames em
que o passe de sombra entra. Continua com folga de 2× sobre o alvo de 55 fps.

A CPU estrangulada não muda o fps porque a cena é **limitada por GPU**: o mesmo
laço de calibração roda em 10,0 ms nativo e 43,5 ms estrangulado (4,35×), o que
prova que o estrangulamento foi aplicado. O trabalho de JavaScript por frame é
pequeno demais para aparecer.

O flag `--disable-frame-rate-limit` (usado para medir custo de frame sem vsync)
**não** entra na medição de carga: em teste A/B ele atrasa em ~3,6 s a
compilação do shader da estátua. Detalhe em `GAUNTLET.md`.

**Pontuação final do gauntlet: 33 de 34**, nenhum item em 0, em 2 rodadas.
O único item abaixo do máximo é o 6 (escala aferida em `F-escala.png` em vez de
`C-base.png`, por impossibilidade geométrica explicada no `GAUNTLET.md`).

---

## Como a cena é feita

| elemento | o que é |
|---|---|
| estátua | **asset de terceiro**: `cristo-web-opt.glb`, 54.136 triângulos, 144 KB, Draco |
| pedestal, mirante, parapeito, escadaria | construído aqui — octógonos e caixas, mesclados numa malha só |
| terreno do Corcovado até o nível do mar | construído aqui — grade polar de 44×128 com ruído *ridged*, cor por vértice |
| Guanabara, Pão de Açúcar, morros | construído aqui — cúpulas deformadas por ruído, uma malha só |
| mar de nuvens | construído aqui — duas lâminas em shader, ruído *billow* com deriva contínua |
| névoa de vale | construído aqui — o mesmo ruído das nuvens, aplicado como preenchimento por altura |
| céu, sol, estrelas | construído aqui — shader procedural, sem foto de skybox |
| figuras de 1,75 m | construído aqui — cápsulas mescladas, `InstancedMesh` |
| luzes da cidade | construído aqui — `Points` esparsos onde o terreno é baixo |

### Escolhas que sustentam o número

- **1 draw call para a estátua.** O GLB vem com uma malha e um material só.
- **Pedestal, mirante, parapeito e escada numa malha só**, com cor por vértice
  em vez de material por peça.
- **Sombra que não recalcula à toa.** `shadowMap.autoUpdate = false`; o mapa só
  é refeito quando o sol muda de posição. Girar a câmera não custa sombra.
- **Nada de textura.** Todo o detalhe — grão da pedra, nuvem, céu, água,
  vegetação — é procedural. Zero bytes de imagem, zero memória de textura.
- **`requestAnimationFrame` pausa com a aba oculta** (verificado no teste).
- **O GLB começa a baixar no `<head>`**, antes de o primeiro módulo existir.
- **No modo ciclo o hash é gravado a cada 2 s**, não a cada 350 ms: com a hora
  mudando por frame, o ritmo normal estouraria o limite de `replaceState` do
  Safari (100 chamadas por 30 s).

---

## Crédito

> **“Christ the Redeemer (Cristo Redentor)”** por **Victor Sodré** — CC BY.

O crédito aparece na interface da peça, no canto inferior esquerdo, sempre
visível. Detalhes da conversão do modelo em `CREDITO.md`.

As seis imagens de `ref/` são do Wikimedia Commons (CC BY-SA) e servem só de
régua de comparação — **não** entram na cena. Autores e links em
`ref/CREDITOS.md`.

three.js — MIT, r185.1, vendorizado em `public/vendor/three/` com a licença.
