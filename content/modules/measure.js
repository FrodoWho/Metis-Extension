const measure = (() => {
  const EXT_ATTR = 'data-measure-extension';
  let highlight = null;
  let hoverEl = null;

  function isExtEl(el) {
    return el && el.hasAttribute && el.hasAttribute(EXT_ATTR);
  }

  function createHighlight() {
    const el = document.createElement('div');
    el.setAttribute(EXT_ATTR, '');
    el.classList.add('msr-hover-highlight');
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function onMouseMove(e) {
    const el = e.target;
    if (isExtEl(el) || el === hoverEl) return;
    hoverEl = el;
    const rect = el.getBoundingClientRect();
    highlight.style.left    = rect.left   + 'px';
    highlight.style.top     = rect.top    + 'px';
    highlight.style.width   = rect.width  + 'px';
    highlight.style.height  = rect.height + 'px';
    highlight.style.display = 'block';
  }

  function enable() {
    highlight = createHighlight();
    document.addEventListener('mousemove', onMouseMove, true);
  }

  function disable() {
    document.removeEventListener('mousemove', onMouseMove, true);
    highlight?.remove();
    highlight = null;
    hoverEl = null;
  }

  return { enable, disable };
})();
