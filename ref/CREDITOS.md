# Referências visuais — créditos e procedência

Todas as 6 imagens vêm do Wikimedia Commons, thumbnail de 1920 px de largura.
Baixadas e conferidas em **18/08/2026**. Nenhuma precisa ser baixada de novo —
elas já estão nesta pasta.

**Licença:** todas Creative Commons BY-SA (3.0 ou 4.0). Se qualquer uma destas
imagens aparecer na peça final (não é o plano — elas são régua de comparação,
não asset de cena), o crédito ao autor e a licença são obrigatórios.

| arquivo | autor | licença | ano | página no Commons |
|---|---|---|---|---|
| `01-frente.jpg` | Mucio Scorzelli | CC BY-SA 4.0 | 2007 | [File:Christ the Redeemer-(Corcovado) front view.jpg](https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_front_view.jpg) |
| `02-lateral.jpg` | Mucio Scorzelli | CC BY-SA 4.0 | 2007 | [File:Christ the Redeemer-(Corcovado) side view.jpg](https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer-(Corcovado)_side_view.jpg) |
| `03-contra-plongee.jpg` | Brunomsb | CC BY-SA 4.0 | 2013 | [File:Christ the Redeemer de baixo.JPG](https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer_de_baixo.JPG) |
| `04-sobre-nuvens.jpg` | Donatas Dabravolskas | CC BY-SA 4.0 | 2024 | [File:Redentor Over Clouds 1.jpg](https://commons.wikimedia.org/wiki/File:Redentor_Over_Clouds_1.jpg) |
| `05-golden-hour.jpg` | Jovem Daniels | CC BY-SA 4.0 | 2013 | [File:Christ the Redeemer Sunset.jpg](https://commons.wikimedia.org/wiki/File:Christ_the_Redeemer_Sunset.jpg) |
| `06-noite.jpg` | Alan Lima Brandão | CC BY-SA 3.0 | 2013 | [File:Cristo Redentor iluminado.JPG](https://commons.wikimedia.org/wiki/File:Cristo_Redentor_iluminado.JPG) |

## O que cada uma resolve

**01-frente** — 1920×1275. Aérea frontal, estátua contra a mata escura do
Corcovado. É a silhueta canônica, e o fundo escuro deixa o contorno limpo para
sobrepor com a captura `A-frente`. Mostra também o pedestal escuro e o mirante.

**02-lateral** — 1920×1275. Aérea de perfil sobre a Lagoa. **A mais informativa
do conjunto**: dá o perfil (a estátua é muito mais fina de lado), o mirante
octogonal inteiro, a escala pelas pessoas na plataforma, e a leitura de baía
com a cidade ao fundo. Serve para os itens 2, 6 e para modelar o pedestal.

**03-contra-plongée** — 1920×1280. Da base, olhando para cima, em luz quente
rasante. Referência de escala *e* de golden hour de perto — repare que a luz
baixa entra por baixo dos braços e do manto, o resto fica em sombra fria.
Céu azul limpo em gradiente, sem nuvem: bom teste do céu procedural.

**04-sobre-nuvens** — 1920×1280. Mar de nuvens ao pôr do sol, sol rasante,
contraluz. É o cartão-postal e o alvo da captura `D-ambiente`: dá a altura das
nuvens em relação ao mirante, a densidade delas e o gradiente do céu.

**05-golden-hour** — 1920×1280. Vista distante do Corcovado com a Guanabara,
o Pão de Açúcar e a névoa atmosférica. O Cristo é minúsculo aqui — **não use
para julgar material**, use para a temperatura da luz de 17h30 e como régua do
item 3 da cena (a baía ao fundo em névoa). Para material em golden hour, a
referência certa é a `03`.

**06-noite** — 1920×1275. Não estava na lista original do prompt, mas o slider
de hora exige 21h e não havia régua para isso. Mostra o que interessa: a estátua
iluminada por baixo em branco levemente azulado, destacada acima da linha de
luzes alaranjadas da cidade, com céu azul-noite ainda não preto.

## Se precisar baixar de novo

Rode `scripts/fetch-refs.sh` na raiz do projeto. Ele é idempotente e confere o
SHA-256 de cada arquivo.
