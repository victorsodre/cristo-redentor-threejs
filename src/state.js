// Estado da vista no hash da URL: quem compartilha o link entrega exatamente
// a vista que estava vendo. Gravação com debounce para não inundar o histórico.
const DEFAULTS = { az: 0.42, pol: 1.30, dist: 96, hour: 12, fig: 1, rot: 1, ciclo: 0 };

export function readState() {
  const s = { ...DEFAULTS };
  const h = location.hash.replace(/^#/, '');
  if (!h) return s;
  for (const pair of h.split('&')) {
    const [k, v] = pair.split('=');
    if (!(k in s)) continue;
    const n = parseFloat(v);
    if (Number.isFinite(n)) s[k] = n;
  }
  s.hour = ((s.hour % 24) + 24) % 24;
  s.fig = s.fig ? 1 : 0;
  s.rot = s.rot ? 1 : 0;
  s.ciclo = s.ciclo ? 1 : 0;
  return s;
}

export function serialize(s) {
  return `#az=${s.az.toFixed(3)}&pol=${s.pol.toFixed(3)}&dist=${s.dist.toFixed(1)}`
       + `&hour=${s.hour.toFixed(2)}&fig=${s.fig}&rot=${s.rot}&ciclo=${s.ciclo}`;
}

export function createWriter() {
  let timer = 0, last = '';
  // O atraso é parâmetro porque no modo ciclo a hora muda a cada frame: com
  // 350 ms daria ~3 replaceState por segundo, e o Safari corta em 100 por 30 s.
  return function write(s, atraso = 350) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const hash = serialize(s);
      if (hash === last) return;
      last = hash;
      history.replaceState(null, '', hash);
    }, atraso);
  };
}
