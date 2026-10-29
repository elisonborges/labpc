/* Progressive offline support. File downloads run without a service worker. */
(() => {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  const worker = new URL('sw.js', document.currentScript.src);
  navigator.serviceWorker.register(worker, { scope: new URL('./', worker).href })
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      const footer = document.querySelector('footer');
      if (footer) footer.append(' · Acesso offline pronto neste navegador');
    }).catch(() => { /* Saved local files remain usable when caching is unavailable. */ });
})();
