// Stop iPad/iPhone Safari from zooming the game.
// iOS ignores `user-scalable=no`, so a thumb on the stick plus a thumb on BOOST can turn into a pinch-zoom,
// and a quick double tap can zoom too. Steering and buttons use pointer events, which keep working.

export function preventZoom() {
  const opts = { passive: false };

  // Safari's own pinch gesture events
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(ev, (e) => { e.preventDefault(); resetZoom(); }, opts);
  }

  // two or more fingers down: never zoom
  document.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, opts);

  // dragging: never zoom or bounce the page; one finger may still scroll a menu list or move the settings slider
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && e.target instanceof Element && e.target.closest('.chapter, .garage-panel, .sheet, input[type=range]')) return;
    e.preventDefault();
  }, opts);

  // quick double tap outside a button: don't zoom (buttons already disable double-tap zoom in CSS)
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = performance.now();
    const onButton = e.target instanceof Element && e.target.closest('button, input');
    if (!onButton && now - lastEnd < 350) e.preventDefault();
    lastEnd = now;
  }, opts);

  // Ctrl/⌘ + wheel or trackpad pinch on a computer
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, opts);

  // if Safari still managed to zoom, snap back
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (window.visualViewport.scale > 1.01) resetZoom(); });
}

/** Re-applying the viewport tag makes Safari jump back to 100%. */
function resetZoom() {
  const meta = document.querySelector('meta[name=viewport]');
  if (!meta) return;
  const content = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  meta.setAttribute('content', content + ' ');
  requestAnimationFrame(() => meta.setAttribute('content', content));
}
