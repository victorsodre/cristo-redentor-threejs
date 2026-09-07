const messages = {
  en: {
    hint: '<b>Drag</b> to orbit · <b>scroll</b> to zoom',
    performance: 'performance', triangles: 'triangles', transferred: 'transferred',
    hour: 'Time of day', rotate: 'Auto-rotate', rotateLabel: '↻ rotate',
    cycle: '24-hour cycle: advances time by one hour per second and enables rotation', cycleLabel: '☀ cycle',
    scale: '1.75 m human figure for scale', scaleLabel: 'scale', copy: 'Copy a link to this view', copyLabel: 'copy link',
    credit: 'Pedestal, overlook, terrain, clouds, bay, and sky were built for this scene.', by: 'by', converted: '— simplified and converted for the web.',
    copied: 'link copied', loading: 'loading model…', copyPrompt: 'Copy a link to this view:', loadFailed: 'The model could not be loaded — see the console',
  },
  'pt-BR': {
    hint: '<b>Arraste</b> para girar · <b>role</b> para aproximar',
    performance: 'desempenho', triangles: 'triângulos', transferred: 'transferido',
    hour: 'Hora do dia', rotate: 'Rotação automática', rotateLabel: '↻ girar',
    cycle: 'Ciclo de 24 h: a hora avança uma hora por segundo e liga o giro', cycleLabel: '☀ ciclo',
    scale: 'Figura humana de 1,75 m para escala', scaleLabel: 'escala', copy: 'Copiar link desta vista', copyLabel: 'copiar link',
    credit: 'Pedestal, mirante, terreno, nuvens, baía e céu construídos para esta cena.', by: 'por', converted: '— simplificado e reconvertido para a web.',
    copied: 'link copiado', loading: 'carregando o modelo…', copyPrompt: 'Copie o link desta vista:', loadFailed: 'Falhou ao carregar o modelo — veja o console',
  },
};

const storageKey = 'cristo-redentor.locale';
let locale = 'en';

function readLocale() {
  try { return localStorage.getItem(storageKey) === 'pt-BR' ? 'pt-BR' : 'en'; } catch { return 'en'; }
}

export function t(key) { return messages[locale][key]; }
export function getLocale() { return locale; }

export function setLocale(next) {
  locale = next === 'pt-BR' ? 'pt-BR' : 'en';
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const value = t(element.dataset.i18n);
    if (element.dataset.i18nHtml === 'true') element.innerHTML = value;
    else element.textContent = value;
  }
  for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = t(element.dataset.i18nTitle);
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
  for (const button of document.querySelectorAll('[data-locale]')) {
    const selected = button.dataset.locale === locale;
    button.setAttribute('aria-pressed', String(selected));
  }
  try { localStorage.setItem(storageKey, locale); } catch { /* Private browsing may deny storage. */ }
  window.dispatchEvent(new CustomEvent('cristo:localechange', { detail: { locale } }));
}

export function initializeLocale() {
  locale = readLocale();
  for (const button of document.querySelectorAll('[data-locale]')) button.addEventListener('click', () => setLocale(button.dataset.locale));
  setLocale(locale);
}
