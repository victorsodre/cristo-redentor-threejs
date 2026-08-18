# Cristo Redentor · cena three.js
## Prompt de execução com gauntlet loop (máx. 3 rodadas)

Você vai construir uma cena web interativa do Cristo Redentor em three.js.
O foco deste trabalho é **qualidade visual e otimização medida** — não é protótipo.
Leia este documento inteiro antes de escrever a primeira linha.

---

## 0 · Regra que governa tudo

**Verifique renderizando, não lendo.** Nenhuma afirmação sobre o resultado vale
sem screenshot ou número medido. Se você não capturou, você não sabe.

---

## 1 · O que construir

Uma página única, autocontida, que mostra o Cristo Redentor no alto do Corcovado,
com controle de câmera e ciclo de luz do dia. O visitante abre o link, entende
onde está em dois segundos, e consegue girar e explorar sem instrução.

**Não** é um configurador. **Não** é um jogo. É uma peça visual que se explora.

---

## 2 · Assets fornecidos

Já convertidos e verificados — carregam em three.js, testados:

| arquivo | triângulos | tamanho | uso |
|---|---|---|---|
| `cristo-web-opt.glb` | 54.136 | 144 KB | **use este** — Draco |
| `cristo-web.glb` | 70.000 | 1,7 MB | fallback sem Draco |
| `cristo-full.glb` | 186.966 | 4,3 MB | não use na web |

Características do GLB: **Y-up**, base apoiada em **Y=0**, centrado em X/Z,
escala em **metros reais** (30 m de altura, 28,81 m de envergadura),
normais suaves, material PBR `MeshStandardMaterial` (roughness 0.92, metalness 0).

O `-opt` usa `KHR_draco_mesh_compression` e **exige DRACOLoader**:

```js
const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');   // copie de three/examples/jsm/libs/draco/
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
```

### Crédito obrigatório (licença CC BY — não é opcional)

Deve aparecer **na interface**, não só no README:

> "Christ the Redeemer (Cristo Redentor)" por Victor Sodré
---

## 3 · Referências visuais

**Já baixadas.** Estão em `ref/`, seis arquivos, 1920 px de largura, conferidos
em 18/08/2026. Não baixe nada — abra a pasta e olhe. São a régua contra a qual
você vai comparar cada rodada.

| arquivo | o que observar |
|---|---|
| `ref/01-frente.jpg` | a silhueta canônica, contra mata escura. É por ela que a peça é reconhecida |
| `ref/02-lateral.jpg` | perfil: a estátua é bem mais fina de lado. Mostra também o mirante octogonal inteiro e a escala pelas pessoas |
| `ref/03-contra-plongee.jpg` | a perspectiva de quem está na base, em luz quente rasante. Referência de escala **e** de material em golden hour |
| `ref/04-sobre-nuvens.jpg` | o mar de nuvens abaixo do mirante, sol rasante. É o cartão-postal |
| `ref/05-golden-hour.jpg` | vista distante: Guanabara, Pão de Açúcar, névoa atmosférica. Régua da cor da luz de 17h30 e do fundo da cena — o Cristo é pequeno aqui, **não julgue material por ela** |
| `ref/06-noite.jpg` | 21h: estátua iluminada por baixo em branco azulado, acima da linha alaranjada das luzes da cidade, céu azul-noite |

Autores, licenças e links no Commons: `ref/CREDITOS.md`. Todas são CC BY-SA —
régua de comparação, não asset de cena; se alguma aparecer na peça, o crédito
vira obrigatório.

Se um arquivo sumir ou corromper, rode `bash scripts/fetch-refs.sh` — ele
rebaixa só o que falta e confere o SHA-256 contra `ref/MANIFEST.sha256`.

---

## 4 · Requisitos funcionais

### Controles (mínimos, mas presentes)

- **OrbitControls** com `enableDamping = true`, `dampingFactor ≈ 0.05`
- `minPolarAngle` / `maxPolarAngle` travados para **nunca ver por baixo do chão**
- `minDistance` / `maxDistance` travados: não entra dentro da estátua, não some no infinito
- `enablePan = false` — pan solto desorienta e não acrescenta nada aqui
- Toque funcionando em mobile (pinch = zoom, um dedo = órbita)

### Auto-rotate

- Liga sozinho após **4 segundos sem interação**
- Desliga no primeiro toque/clique/scroll, e volta a contar
- Velocidade lenta o bastante para não enjoar: `autoRotateSpeed ≈ 0.4`
- Botão de liga/desliga explícito na interface

### Hora do dia

Controle deslizante 0–24h que move **de verdade** a luz direcional, a cor da
luz, a cor do céu e a névoa. Quatro marcos que precisam ficar distintos:

| hora | leitura |
|---|---|
| 06h | amanhecer, sol rasante pelo leste, névoa densa no vale |
| 12h | sol alto, sombra curta, contraste duro |
| 17h30 | golden hour — cor da luz em `05-golden-hour.jpg`, material em `03-contra-plongee.jpg` |
| 21h | noite, estátua iluminada por baixo (como é na realidade), cidade acesa ao fundo — `06-noite.jpg` |

### Modo ciclo — 24 h em 24 s

*(Requisito acrescentado em 18/08/2026, depois de as rodadas 1 e 2 fecharem.
A aferição está no adendo do `GAUNTLET.md`, e a rubrica ganhou o item 18.)*

Um botão explícito que liga um **timelapse**: o giro automático permanece ligado
e a hora do dia avança sozinha **1 hora por segundo** — o dia inteiro em 24
segundos, passando pelos quatro marcos sem que ninguém toque no controle.

- Liga e desliga por botão, com estado visível
- Ligar o ciclo **liga o giro na hora**, sem esperar os 4 segundos de ociosidade
- Desligar o ciclo **congela a hora onde estava** e devolve o giro à preferência
- Interagir (arrastar, rolar) pausa o giro como sempre, mas **não** desliga o ciclo
- Vive no hash da URL como `ciclo=1`: um link pode entregar a peça já em ciclo
- A hora andando não pode custar uma reconstrução de sombra por frame — o mapa
  de sombra é caro; recalcule em passos de sol, não em passos de frame
- A hora andando não pode inundar o histórico do navegador: escrever no hash a
  cada frame estoura o limite de `replaceState` do Safari (100 por 30 s)

### HUD de performance

Visível, discreto, canto da tela: **fps · draw calls · triângulos · MB transferidos**.

Não é debug esquecido — é parte da peça. O trabalho é sobre otimização, então o
número fica à vista.

### Link profundo (importante)

O estado da câmera e a hora do dia vivem no **hash da URL**, atualizados com
debounce. Quem compartilha o link entrega **exatamente a vista que estava vendo**.

Botão "copiar link desta vista" explícito.

---

## 5 · Cena (o que construir em volta)

A estátua é asset. **O resto é seu trabalho** — e é onde a peça ganha ou perde.

1. **Pedestal e mirante** — a base octogonal onde a estátua se apoia
2. **Nuvens passando por baixo** — o Corcovado está acima delas. Movimento lento,
   contínuo, sem loop perceptível. É o elemento que mais entrega "Rio".
3. **Guanabara ao fundo** — silhueta do Pão de Açúcar e da baía, em névoa
   atmosférica. Não precisa de geometria detalhada; precisa de leitura correta.
4. **Referência de escala** — figura humana de 1,75 m na base, com toggle.
   Sem ela ninguém percebe que a estátua tem 30 m.
5. **Céu** — gradiente coerente com a hora, não skybox de foto.

### Ordem de prioridade se faltar tempo

Silhueta e material corretos > luz > nuvens > baía > figura humana.
**Nunca** sacrifique os dois primeiros por qualquer um dos outros.

---

## 6 · O gauntlet loop

Três rodadas, no máximo. Cada rodada é: **construir → capturar → comparar → anotar → corrigir**.

### Mecanismo de captura (monte isto na rodada 1, antes de qualquer ajuste fino)

Um script que abre a página em browser headless e captura **quatro ângulos fixos**,
sempre os mesmos, para que as rodadas sejam comparáveis:

| captura | câmera | hora | compara com |
|---|---|---|---|
| `A-frente` | frontal, altura do peito da estátua | 12h | `01-frente.jpg` |
| `B-lateral` | 90° lateral | 12h | `02-lateral.jpg` |
| `C-base` | contra-plongée da base | 17h30 | `03-contra-plongee.jpg` |
| `D-ambiente` | ¾ afastada, mostrando nuvens e baía | 17h30 | `04-sobre-nuvens.jpg` |

O mesmo script mede: fps médio em 10 s de auto-rotate, draw calls, triângulos,
bytes transferidos e tempo até o primeiro frame.

### Condições de medição (leia antes de anotar qualquer número)

**A máquina de desenvolvimento é rápida demais para representar o visitante.**
iMac Pro 2017: Xeon W 8 núcleos / 16 threads, 32 GB de RAM, Radeon Pro Vega 56
com 8 GB de VRAM. Bater 55 fps aqui é fácil e **não prova nada** sobre o
notebook de quem abre o link.

Por isso, meça em **duas condições**, e registre as duas no `GAUNTLET.md`:

| condição | como | serve para |
|---|---|---|
| nativa | headless, sem throttling, 1920×1080 | item 9 da rubrica |
| estrangulada | `Emulation.setCPUThrottlingRate` a 4× (via DevTools Protocol) | aproximar o visitante médio; alimenta o item 10 |

Um número nativo bom com um número estrangulado ruim é um resultado **ruim** —
anote assim, não arredonde para o lado bonito.

**Captura sequencial, um ângulo por vez.** Abra o browser, capture, feche, vá
para o próximo. Nunca quatro headless em paralelo: além de brigar por GPU e
falsear o fps, é o tipo de carga que pendura a sessão. O gargalo desta máquina
nunca foi recurso — é operação longa que não retorna.

**Mesmo estado de máquina nas 3 rodadas.** Antes da rodada 1, anote o que está
aberto e o load médio (`uptime`). Repita esse estado nas rodadas 2 e 3. Se a
rodada 1 mede com a máquina limpa e a rodada 3 com um editor compilando ao
lado, as rodadas não são comparáveis — e o gauntlet inteiro depende de rodadas
comparáveis. Antes de medir, confira que não há VM, indexação do Spotlight ou
preparação de atualização do macOS rodando; qualquer um dos três come um núcleo
inteiro sem aparecer na tela.

### Rubrica — pontue cada item 0, 1 ou 2

**0 = errado · 1 = aceitável · 2 = bom**

| # | critério | como aferir |
|---|---|---|
| 1 | silhueta frontal bate com a referência | sobreponha `A-frente` e `01-frente.jpg` |
| 2 | proporção de perfil correta | `B-lateral` vs `02-lateral.jpg` |
| 3 | material lê como pedra fosca, não plástico | inspeção visual das 4 capturas |
| 4 | luz coerente com a hora escolhida | direção da sombra vs posição do sol |
| 5 | golden hour quente sem estourar em laranja | `C-base` vs `03-contra-plongee.jpg` (material) e `05-golden-hour.jpg` (cor do ambiente) |
| 6 | escala legível (30 m se percebe) | figura humana visível em `C-base` |
| 7 | nuvens convincentes e sem loop aparente | 3 capturas espaçadas de `D-ambiente` |
| 8 | sem serrilhado, z-fighting ou clipping | zoom 200% nas bordas |
| 9 | fps ≥ 55 desktop @1920×1080, sem throttling | medido, com estado de máquina anotado |
| 10 | fps ≥ 30 com CPU throttling 4× | medido |
| 11 | primeiro frame < 2 s em 4G simulado | medido |
| 12 | total transferido < 1,5 MB | medido |
| 13 | draw calls < 30 | medido |
| 14 | controles: sem ver por baixo do chão, sem entrar na estátua | teste manual |
| 15 | auto-rotate liga/desliga como especificado | teste manual |
| 16 | link profundo restaura a vista exata | abra a URL copiada em aba nova |
| 17 | crédito CC BY visível na interface | inspeção |
| 18 | modo ciclo: hora anda 1 h/s, giro segue ligado, botão congela | medido, e fps do modo medido à parte |

**Máximo: 36 pontos.** (Eram 34 antes de o item 18 existir.)

### Condições de parada

- **≥ 32 pontos, com nenhum item em 0** → aprovado, pare antes das 3 rodadas
  (o corte era 30 quando o máximo era 34)
- **3 rodadas cumpridas** → pare de qualquer forma e entregue com o relatório honesto
- **Qualquer item de 9 a 13 em 0 na rodada 3** → pare e **documente como falha**,
  não maquie o número

### Regra de cada rodada

Ao fim de cada rodada escreva `GAUNTLET.md` com: pontuação item a item, o que
mudou desde a rodada anterior, e o que **não** deu para resolver e por quê.

Na rodada seguinte, **corrija apenas o que pontuou 0 ou 1**. Não refatore o que
já está em 2 — trocar coisa que funciona é como se perde rodada.

---

## 7 · Restrições

- **three.js e mais nada pesado.** Sem framework de UI, sem bundler complexo.
- **Sem CDN em produção** — dependências locais, para a página não quebrar sozinha.
- **Sem textura de 4K.** Se precisar de textura, no máximo 1024², comprimida.
- **Sem postprocessing caro.** Bloom só se sobrar orçamento de fps, e medido antes/depois.
- **Nada de `requestAnimationFrame` rodando quando a aba está oculta** — pause.
- **Nenhum número inventado.** Todo valor no `GAUNTLET.md` sai de medição.

---

## 8 · Entregáveis

```
/
├── ref/                    JÁ EXISTE — 6 referências + CREDITOS.md + MANIFEST.sha256
├── cristo-*.glb            JÁ EXISTE — os 3 GLB na raiz; copie o -opt para public/
├── CREDITO.md              JÁ EXISTE — como o GLB foi convertido e aferido
├── scripts/fetch-refs.sh   JÁ EXISTE — rebaixa referência que sumir
│
├── index.html
├── src/                    js da cena
├── public/
│   ├── cristo-web-opt.glb
│   └── draco/
├── scripts/
│   └── capture.mjs         captura os 4 ângulos + mede performance
├── shots/
│   └── r1/  r2/  r3/       uma pasta por rodada
├── GAUNTLET.md             pontuação e histórico das 3 rodadas
└── README.md               o que é, como rodar, créditos, números finais
```

O `README.md` precisa trazer a **tabela de performance final medida** e o
crédito do modelo. Se algum alvo não foi atingido, ele aparece na tabela como
não atingido — não some.

---

## 9 · Antes de dizer que terminou

Responda, com evidência:

1. Qual foi a pontuação final e quais itens ficaram abaixo de 2?
2. Quais números de performance foram medidos, em que máquina e resolução?
3. O que você tentou e não funcionou?
4. O que na cena é asset de terceiro e o que você construiu?

Se não conseguir responder as quatro com screenshot ou número, o trabalho não terminou.
