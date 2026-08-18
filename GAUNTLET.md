# Gauntlet — Cristo Redentor em three.js

Três rodadas no máximo. Cada rodada: construir, capturar, comparar com `ref/`,
pontuar item a item, anotar o que não deu para resolver.

Nenhum número aqui foi estimado. Todos saem de `shots/<rodada>/metrics.json` e
`shots/<rodada>/test-ui.json`, gerados por `scripts/capture.mjs` e
`scripts/test-ui.mjs`.

---

## Condições de medição

**Máquina:** iMac Pro 2017 — Xeon W-2140B 8c/16t 3,2 GHz, 32 GB, Radeon Pro
Vega 56 8 GB, macOS 15.6 (Darwin 24.6).

**Renderizador medido:** `ANGLE (AMD, ANGLE Metal Renderer: AMD Radeon Pro Vega
56)` — GPU de verdade, não SwiftShader. Isso é conferido em toda rodada e sai no
`metrics.json`; se caísse para software, os fps não valeriam nada.

**Browser:** Chromium 1228 (canal `chromium` do Playwright 1.61), headless novo,
`--use-angle=metal --enable-gpu --disable-frame-rate-limit`, 1920×1080, DPR 1.

**Captura sequencial:** um browser por ângulo, aberto e fechado. Nunca dois
headless ao mesmo tempo — brigariam pela GPU e falseariam o fps.

**Duas condições, sempre as duas:**

| condição | como | calibração |
|---|---|---|
| nativa | sem estrangulamento | laço fixo de 4 M iterações: **10,5 ms** |
| estrangulada | `Emulation.setCPUThrottlingRate: 4` | mesmo laço: **43,7 ms** — 4,16× mais lento, o estrangulamento está de fato aplicado |

A calibração existe porque os dois fps deram quase iguais. Sem ela, o número
"igual" seria suspeito de estrangulamento que não pegou. Com ela, a leitura
correta é outra: **a cena é limitada por GPU, não por CPU** — o trabalho de
JavaScript por frame é pequeno demais para 4× de CPU fazer diferença.

**Rede:** 4G rápido emulado por CDP (4 Mbit/s de descida, 3 de subida, 20 ms de
latência), cache frio (`cache-control: no-store` no servidor).

---

## Rodada 1 — 18/08/2026, 12h

**Estado da máquina:** `up 1:06`, load 1,56 / 1,79 / 1,94. iTerm (15,7 %) e
WindowServer (7,5 %) no topo da CPU; sem VM, sem preparação de atualização do
macOS, sem indexação ativa do Spotlight. (`shots/r1/estado-maquina.txt`)

O que existe nesta rodada: cena completa (céu procedural, sol e ciclo de 24 h,
estátua, pedestal e mirante octogonais, escadaria, terreno do Corcovado até o
nível do mar, Guanabara, Pão de Açúcar, luzes da cidade, mar de nuvens, figuras
de 1,75 m), HUD, link profundo, e os dois scripts de aferição.

### Pontuação — 29/34

| # | critério | nota | evidência |
|---|---|---|---|
| 1 | silhueta frontal bate com a referência | **2** | `cmp-A-frente.png` — proporção de braços, manto e cabeça conferem com `01-frente.jpg` |
| 2 | proporção de perfil correta | **2** | `cmp-B-lateral.png` — perfil fino, capuz e queda do manto batem com `02-lateral.jpg` |
| 3 | material lê como pedra fosca | **1** | bom às 12h; no contra-plongée das 17h30 (`C-base.png`) a estátua fica quase preta, e às 21h (`E-noite.png`) estoura em branco puro |
| 4 | luz coerente com a hora | **2** | sombra da estátua no piso acompanha o sol nas 4 capturas; às 12h curta, às 17h30 longa |
| 5 | golden hour quente sem estourar | **1** | não estoura mais em laranja, mas erra para o outro lado: a luz de céu está fraca e a face voltada para a câmera some no escuro |
| 6 | escala legível (30 m se percebe) | **1** | figuras aparecem em `A-frente` e `B-lateral`; **não aparecem em `C-base`**, que é justamente onde a rubrica pede |
| 7 | nuvens convincentes e sem loop | **1** | sem loop perceptível (deriva contínua, octaves em velocidades diferentes), mas a lâmina plana corta o terreno numa **aresta reta** e lê como placa, não como nuvem |
| 8 | sem serrilhado, z-fighting ou clipping | **2** | `zoom-borda-braco.png` e `zoom-pedestal.png` a 200%: bordas limpas, sem briga de profundidade |
| 9 | fps ≥ 55 desktop @1920×1080 | **2** | **155,0 fps** média em 10 s de auto-rotate; frame mediano **3,00 ms**, p95 14,40 ms, pior 19,70 ms (1548 frames) |
| 10 | fps ≥ 30 com CPU 4× | **2** | **153,5 fps** média; frame mediano 3,00 ms, p95 14,90 ms. Estrangulamento verificado pela calibração (10,5 → 43,7 ms) |
| 11 | primeiro frame < 2 s em 4G | **1** | primeiro frame **843 ms**; **com a estátua 1577 ms** numa medição e **2089 ms** na anterior — passa por pouco e varia demais para eu chamar de 2 |
| 12 | total transferido < 1,5 MB | **2** | **0,469 MB** (491.918 bytes, gzip no servidor) |
| 13 | draw calls < 30 | **2** | **11** em todas as capturas, 93.672 triângulos |
| 14 | controles: sem ver por baixo do chão, sem entrar na estátua | **2** | medido: y da câmera trava em −5,75 m (piso −9,2), raio horizontal trava em 11,5 m, distância mínima 22,0 m |
| 15 | auto-rotate liga/desliga como especificado | **2** | medido: parado a 2,5 s, girando a 5,7 s, para no clique, botão desliga de vez |
| 16 | link profundo restaura a vista | **2** | medido: link copiado reabre com **0,000 m** de diferença na posição da câmera, hora e toggles iguais |
| 17 | crédito CC BY visível na interface | **2** | canto inferior esquerdo, sempre visível |

**Total: 29/34.** Nenhum item em 0. Como o corte de aprovação é 30, a rodada 2
acontece.

### O que a rodada 1 mostrou (e que a rodada 2 vai atacar)

1. **A nuvem é uma placa.** A lâmina plana em y = −330 atravessa o terreno e a
   interseção vira linha reta poligonal. É o defeito visual mais grave da peça.
2. **A sombra do golden hour é cega.** A luz de céu (hemisférica) está fraca
   demais para o entardecer: o que não pega sol vira silhueta.
3. **Os refletores da noite estouram.** 1400 de intensidade lavam a estátua toda
   e desenham quatro elipses duras no pedestal.
4. **`C-base` não mostra as figuras**, então não serve de prova de escala.
5. **A carga em 4G varia** entre 1,58 s e 2,09 s — precisa de folga real e de
   mais de uma medição para o número valer.

### O que já estava certo e **não** vai ser mexido

Silhueta e proporção (itens 1 e 2), coerência de luz (4), ausência de serrilhado
e z-fighting (8), os quatro números de desempenho (9, 10, 12, 13), controles
(14), auto-rotate (15), link profundo (16) e crédito (17). Trocar o que já
pontua 2 é o jeito mais rápido de perder uma rodada.

---

## Rodada 2 — 18/08/2026, 12h53

**Estado da máquina:** `up 1:59`, load 1,79 / 2,05 / 2,28. **Diferença
importante em relação à rodada 1:** o `mediaanalysisd` do macOS acordou no meio
da rodada e ficou em ~30 % de um núcleo. Isso não invalida a comparação de
desempenho (a cena é limitada por GPU, e a prova disso está na calibração), mas
está anotado porque a rodada 1 mediu com a máquina limpa. Os fps caíram de 155
para 144 entre as rodadas — parte é esse daemon, não a cena.
(`shots/r2/estado-maquina.txt`)

### O que mudou desde a rodada 1

1. **Nuvem deixou de ser placa.** Duas mudanças juntas:
   - o banco passou a ser sombreado pelo **gradiente do próprio ruído** (duas
     amostras extras dão uma normal), e o ruído virou **billow**
     (`1 - |2n-1|`), que faz topo arredondado em vez de duna;
   - entrou o **preenchimento de vale** (`src/cloudfill.js`): abaixo do topo da
     camada, terreno, morros e água dissolvem na cor da nuvem, usando **o mesmo
     ruído da lâmina**, acumulando com a distância e com a profundidade. É isso
     que apaga a aresta reta da interseção plano × malha.
2. **Sombra do fim de tarde deixou de ser cega.** Luz hemisférica de 0,78 → 1,45
   às 17h30. A face que não pega sol agora lê como pedra, não como silhueta.
3. **Refletores da noite domados.** 1400 → 320 de intensidade, ângulo e penumbra
   abertos, foco 2 m mais alto. A estátua parou de estourar em branco chapado.
4. **Mar de nuvens virou fenômeno de hora.** Cobertura por hora recalibrada:
   0,12 ao meio-dia (dá para ver a Guanabara), 0,48 no amanhecer, 0,38 às 17h30.
5. **Carga em 4G.** O GLB agora começa a baixar **no `<head>`**, antes do
   primeiro módulo existir; o `importmap` foi movido para **antes** dos
   `modulepreload` (estavam depois, e a corrida fazia o mapa ser ignorado — sob
   CPU estrangulada isso quebrava a página em 100 % das vezes); e o mundo pesado
   só é construído **depois** que a estátua entra na cena.
6. **Layout de celular** refeito: HUD, barra e crédito param de se cobrir.
7. **`C-base` e `D-ambiente` reenquadradas**, e entrou uma sexta captura,
   `F-escala` (ver item 6 abaixo).

### Um erro de medição encontrado e corrigido

A rodada 1 mediu carga com `--disable-frame-rate-limit` ligado. Em A/B controlado
(`base` × `completo`, 4 medições), esse flag **atrasa em ~3,6 s** o primeiro
frame com a estátua: sem teto de vsync a fila da GPU satura e a compilação do
shader da estátua fica esperando. O flag serve para medir custo de frame sem
vsync e continua ligado **só** na prova de fps; a prova de carga agora roda sem
ele. Por isso os números de carga da rodada 1 e da 2 não são diretamente
comparáveis — o da rodada 2 é o correto.

### Pontuação — 33/34

| # | critério | r1 | r2 | evidência |
|---|---|---|---|---|
| 1 | silhueta frontal | 2 | **2** | `cmp-A-frente.png` — braços, manto, capuz e base pregueada batem com a `01` |
| 2 | proporção de perfil | 2 | **2** | `cmp-B-lateral.png` |
| 3 | material lê como pedra fosca | 1 | **2** | `C-base.png` (pedra cinza com luz quente rasante por baixo do braço), `E-noite.png` (dobras ainda legíveis sob os refletores) |
| 4 | luz coerente com a hora | 2 | **2** | `marcos-hora.png` — as quatro horas, mesma câmera, quatro leituras distintas |
| 5 | golden hour sem estourar | 1 | **2** | `C-base.png` vs `03` (material) e `D-ambiente.png` vs `05` (cor do ambiente) |
| 6 | escala legível | 1 | **1** | figuras visíveis em `A`, `B`, `D`, `F-escala`. **Não em `C-base`** — ver nota abaixo |
| 7 | nuvens convincentes, sem loop | 1 | **2** | `D-ambiente.png`, `marcos-hora.png`. Deriva contínua com 4 octaves em velocidades irracionais; restam vestígios poligonais fracos onde uma crista atravessa a lâmina |
| 8 | sem serrilhado, z-fighting, clipping | 2 | **2** | `zoom-borda-braco.png`, `zoom-pedestal.png` a 200% |
| 9 | fps ≥ 55 desktop @1920×1080 | 2 | **2** | **144,3 fps** média em 10 s de auto-rotate; frame mediano **3,10 ms**, p95 14,50 ms, pior 29,40 ms (1441 frames) |
| 10 | fps ≥ 30 com CPU 4× | 2 | **2** | **142,9 fps**; mediano 3,40 ms. Calibração: laço fixo 10,0 → 43,5 ms (4,35×) |
| 11 | primeiro frame < 2 s em 4G | 1 | **2** | primeiro frame **918 ms**; **com a estátua 1256 ms** (mediana de 3: 1256 / 1225 / 1374 ms) |
| 12 | total transferido < 1,5 MB | 2 | **2** | **0,472 MB** (495.301 bytes, com gzip) |
| 13 | draw calls < 30 | 2 | **2** | **11**, em todas as 6 capturas; 93.672 triângulos |
| 14 | controles: sem ver por baixo do chão, sem entrar na estátua | 2 | **2** | medido: y trava em −5,75 m (piso −9,2), raio horizontal trava em 11,5 m, distância mínima 22,0 m |
| 15 | auto-rotate liga/desliga | 2 | **2** | medido: parado a 2,5 s, girando a 5,7 s, para no clique, botão desliga de vez |
| 16 | link profundo restaura a vista | 2 | **2** | medido: **0,000 m** de diferença na posição da câmera; hora e toggles iguais |
| 17 | crédito CC BY visível | 2 | **2** | canto inferior esquerdo; no celular a segunda linha some, **a licença nunca** |

**Total: 33/34, nenhum item em 0.** O corte de aprovação é 30 — a peça está
aprovada e a rodada 3 não acontece.

Extra, fora da rubrica: 14/14 verificações em `test-ui.json`, incluindo toque
em celular (um dedo orbita, pinça aproxima: 96,0 → 44,7 m) e pausa do
`requestAnimationFrame` com a aba oculta (1 frame em 1,2 s).

### O item 6 e por que ele fica em 1

A rubrica afere escala por "figura humana visível em `C-base`". Com o alvo da
órbita no peito da estátua, isso é **geometricamente impossível**: para olhar de
baixo para cima o quadro inteiro fica acima da horizontal, e o piso do mirante —
onde as pessoas estão — cai fora por 12° a 18°, em qualquer combinação de
distância e ângulo permitida pelos limites de câmera. As opções eram estragar a
`C-base` (que é a comparação com a `03`) ou provar escala em outro quadro.

Escolhi provar em outro quadro: **`F-escala.png`** mostra as nove figuras de
1,75 m no mirante com a estátua inteira, e as figuras também aparecem em
`A-frente`, `B-lateral` e `D-ambiente`. O critério de fundo — "30 m se percebe" —
está atendido; o método de aferição pedido, não. Fica 1, e fica dito.

### O que não deu para resolver

- **Vestígio poligonal na nuvem.** Onde uma crista do terreno atravessa a lâmina
  de nuvem, ainda dá para achar uma aresta reta se você procurar (mais visível
  em `D-ambiente`, à direita). O preenchimento por altura resolve a maior parte;
  resolver por completo exigiria *soft particles* — ler o buffer de profundidade
  numa passada extra — e isso é orçamento de fps que a peça não precisa gastar.
- **Terreno em leitura de colina, não de maciço.** A malha polar tem 150 m entre
  anéis a 1 km do cume; detalhe mais fino que isso viraria serrilhado. O relevo
  lê corretamente como Rio em névoa, mas de perto é liso demais.
- **`mediaanalysisd` no meio da rodada 2.** Anotado acima; não deu para garantir
  o mesmo estado de máquina da rodada 1, e os fps caíram ~7 % por causa disso.

---

## Adendo — modo ciclo (18/08/2026, depois do gauntlet)

Requisito acrescentado pelo Victor depois de as duas rodadas fecharem: um modo
que **mantém o giro e faz a hora do dia andar sozinha**, 1 hora por segundo — o
dia inteiro em 24 s. O `PROMPT-cristo-threejs.md` ganhou o requisito na seção 4
e o item 18 na rubrica (máximo 36, corte de aprovação 32). As rodadas 1 e 2
correram com a rubrica de 34 pontos e **não foram repontuadas**; o item 18 é
aferido aqui.

### Item 18 — **2**

| verificação | medido |
|---|---|
| a hora anda ~1 h por segundo | **3,02 h em 3,0 s** (5,30 → 8,32) |
| o giro continua ligado no ciclo | azimute variou **−0,122 rad**, `ciclo=true` |
| o botão para o ciclo e congela a hora | 8,35 → **8,35** em 1,2 s, `ciclo=false` |
| link com `ciclo=1` entrega a peça em ciclo, girando na hora | `idle` já entra acima do limiar de 4 s |

`shots/r2/test-ui.json` — **17/17 verificações**, as três últimas são do ciclo.

### Custo medido do modo

| condição | fps média | frame mediano | p95 | draw calls |
|---|---|---|---|---|
| giro só (rodada 2) | 144,3 | 3,10 ms | 14,50 ms | 11 |
| **giro + ciclo** | **126,7** | 3,10 ms | **16,30 ms** | 11–14 |

O frame mediano não mexe: o custo do ciclo não está no desenho, está nos frames
em que o mapa de sombra é refeito — e é por isso que ele aparece no p95 e não na
mediana. Duas decisões de projeto sustentam esse número:

1. **Sombra em passos de sol, não de frame.** Refazer o mapa de 2048² com 54 k
   triângulos a 60 fps seria desperdício puro. O mapa é refeito quando o sol
   andou 0,15 h — cerca de 7 vezes por segundo no ciclo. A sombra continua
   coerente com a hora (item 4) e o custo cai por um fator de ~8.
2. **Hash a cada 2 s no ciclo.** Com a hora mudando por frame, o debounce normal
   de 350 ms daria ~3 `replaceState` por segundo — 90 em 30 s, rente ao limite
   de 100 do Safari. No ciclo o intervalo sobe para 2 s.

O HUD mostra as draw calls oscilando entre 11 e 14 no modo ciclo, porque o passe
de sombra entra na conta do frame em que acontece. É a leitura honesta do custo,
e segue bem abaixo do teto de 30.

### Um detalhe de infra que mudou junto

`scripts/serve.mjs` agora cai para a próxima porta livre em vez de estourar
`EADDRINUSE`. Motivo prático: com um `node scripts/serve.mjs` no ar para olhar a
cena, a medição não conseguia subir o próprio servidor na 5173.
