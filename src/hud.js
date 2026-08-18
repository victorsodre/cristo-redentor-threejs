// HUD de desempenho: parte da peça, não sobra de debug.
export function createHud(renderer) {
  const el = {
    fps: document.getElementById('m-fps'),
    calls: document.getElementById('m-calls'),
    tris: document.getElementById('m-tris'),
    mb: document.getElementById('m-mb'),
  };
  const window_ = [];
  let acc = 0;

  function transferred() {
    let total = 0;
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) total += nav.transferSize || 0;
    for (const r of performance.getEntriesByType('resource')) total += r.transferSize || 0;
    return total;
  }

  function frame(dt) {
    window_.push(dt);
    if (window_.length > 90) window_.shift();
    acc += dt;
    if (acc < 0.4) return;
    acc = 0;
    const mean = window_.reduce((a, b) => a + b, 0) / window_.length;
    const fps = mean > 0 ? 1 / mean : 0;
    el.fps.textContent = fps.toFixed(0);
    el.fps.className = fps < 30 ? 'warn' : '';
    el.calls.textContent = renderer.info.render.calls;
    el.tris.textContent = renderer.info.render.triangles.toLocaleString('pt-BR');
    el.mb.textContent = (transferred() / 1048576).toFixed(2) + ' MB';
  }

  return { frame, transferred };
}
