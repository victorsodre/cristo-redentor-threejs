#!/usr/bin/env bash
# Rebaixa as referências visuais do Wikimedia Commons e confere o SHA-256.
# Idempotente: pula o que já está íntegro. Rode da raiz do projeto.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p ref
UA="cristo-redentor-refs/1.0 ()"
B="https://upload.wikimedia.org/wikipedia/commons/thumb"

REFS=(
  "01-frente.jpg|$B/a/aa/Christ_the_Redeemer-%28Corcovado%29_front_view.jpg/1920px-Christ_the_Redeemer-%28Corcovado%29_front_view.jpg"
  "02-lateral.jpg|$B/0/06/Christ_the_Redeemer-%28Corcovado%29_side_view.jpg/1920px-Christ_the_Redeemer-%28Corcovado%29_side_view.jpg"
  "03-contra-plongee.jpg|$B/f/fe/Christ_the_Redeemer_de_baixo.JPG/1920px-Christ_the_Redeemer_de_baixo.JPG"
  "04-sobre-nuvens.jpg|$B/1/1b/Redentor_Over_Clouds_1.jpg/1920px-Redentor_Over_Clouds_1.jpg"
  "05-golden-hour.jpg|$B/f/f9/Christ_the_Redeemer_Sunset.jpg/1920px-Christ_the_Redeemer_Sunset.jpg"
  "06-noite.jpg|$B/f/f8/Cristo_Redentor_iluminado.JPG/1920px-Cristo_Redentor_iluminado.JPG"
)

for entry in "${REFS[@]}"; do
  name="${entry%%|*}"; url="${entry#*|}"
  if [ -f "ref/$name" ] && (cd ref && grep " $name\$" MANIFEST.sha256 | shasum -a 256 -c --status) 2>/dev/null; then
    echo "ok    $name (já íntegro)"
    continue
  fi
  echo "baixa $name"
  curl -fsSL -A "$UA" -o "ref/$name" "$url"
done

echo
(cd ref && shasum -a 256 -c MANIFEST.sha256)
