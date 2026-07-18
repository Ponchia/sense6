import '@ponchia/ui';
import { initThemeToggle } from '@ponchia/ui/behaviors';
import './styles.css';

import * as colorBlindness from './exams/color-blindness.js';
import * as tetracromia from './exams/tetracromia.js';
import { navigate, startRouter } from './router.js';
import { renderGallery } from './site.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const gamutChip = document.querySelector('#gamut-chip');

const exams = [tetracromia, colorBlindness];
const registry = new Map(exams.map((exam) => [exam.meta.id, exam]));

initThemeToggle();
detectDisplay();

let cleanup = null;

function context() {
  return {
    app,
    announcer,
    gamutChip,
    navigate,
    navigateHome: () => navigate(''),
  };
}

startRouter((route) => {
  cleanup?.();
  cleanup = null;
  app.innerHTML = '';
  document.body.classList.remove('lab-mode');
  window.scrollTo({ top: 0, behavior: 'instant' });

  const exam = registry.get(route);
  if (exam) {
    cleanup = exam.mount(context());
  } else if (route) {
    // Unknown route — normalize to the gallery; the hashchange re-runs this.
    navigate('');
  } else {
    cleanup = renderGallery({ ...context(), exams: exams.map((entry) => entry.meta) });
  }
});

function detectDisplay() {
  const p3 = window.matchMedia?.('(color-gamut: p3)').matches;
  const srgb = window.matchMedia?.('(color-gamut: srgb)').matches;
  gamutChip.textContent = p3 ? 'P3 reported' : srgb ? 'sRGB reported' : 'Color gamut unknown';
  gamutChip.dataset.gamut = p3 ? 'p3' : srgb ? 'srgb' : 'unknown';
}
