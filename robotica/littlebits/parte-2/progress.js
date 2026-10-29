/* Progresso local da Parte 2 — compartilhado pelas nove missões, inclusive offline. */
(() => {
  'use strict';
  const key = 'labpc-littlebits-parte2-v1';
  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      return Array.isArray(data?.completed)
        ? [...new Set(data.completed.filter(n => Number.isInteger(n) && n >= 1 && n <= 9))]
        : [];
    } catch { return []; }
  }
  function refresh() {
    const completed = read();
    document.querySelectorAll('[data-n]').forEach(el => {
      const n = Number(el.dataset.n);
      el.classList.toggle('done', completed.includes(n));
      if (!el.dataset.titleOriginal) el.dataset.titleOriginal = el.title || 'Missão ' + n;
      el.title = el.dataset.titleOriginal + (completed.includes(n) ? ' — concluída' : '');
    });
    const count = document.getElementById('energyProgressCount');
    if (count) count.textContent = completed.length + ' de 9 missões concluídas';
    return completed;
  }
  globalThis.EnergyProgress = refresh;
  function init() {
    const nav = document.querySelector('nav.progress');
    if (!nav || document.getElementById('energyProgressActions')) return;
    const panel = document.createElement('div');
    panel.id = 'energyProgressActions';
    panel.className = 'energy-progress-actions';
    const count = document.createElement('strong');
    count.id = 'energyProgressCount';
    count.setAttribute('aria-live','polite');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '↺ Reiniciar progresso das 9 missões';
    button.addEventListener('click', () => {
      if (!confirm('Reiniciar o progresso das 9 missões da Parte 2? Todas voltarão a aparecer como pendentes.')) return;
      try { localStorage.removeItem(key); }
      catch { alert('Não foi possível reiniciar o progresso neste navegador.'); return; }
      refresh();
      const next = document.getElementById('next');
      if (next) next.hidden = true;
      const status = document.getElementById('status');
      if (status) status.textContent = 'Progresso reiniciado. Você pode refazer as nove missões.';
    });
    panel.append(count, button);
    nav.insertAdjacentElement('afterend',panel);
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
