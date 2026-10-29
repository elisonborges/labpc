/* Refreshes the shared navigation, including the original Mission 1. */
(() => {
  'use strict';
  globalThis.EnergyProgress = () => {
    let completed = [];
    try { const saved = JSON.parse(localStorage.getItem('labpc-littlebits-parte2-v1') || '{}'); if (Array.isArray(saved?.completed)) completed = saved.completed; } catch {}
    document.querySelectorAll('[data-n]').forEach(el => el.classList.toggle('done',completed.includes(Number(el.dataset.n))));
  };
  EnergyProgress();
})();
