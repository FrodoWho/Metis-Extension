const state = { measure: false, guides: false, direction: 'v', gapVisible: false };

function syncUI() {
  document.querySelectorAll('.tool').forEach((row) => {
    const tool    = row.dataset.tool;
    const enabled = state[tool];
    const badge   = row.querySelector('.badge');
    row.classList.toggle('active', enabled);
    badge.textContent = enabled ? 'ON' : 'OFF';
  });

  const sub = document.getElementById('guides-sub');
  sub.style.display = state.guides ? 'flex' : 'none';

  document.getElementById('btn-v').classList.toggle('active', state.direction === 'v');
  document.getElementById('btn-h').classList.toggle('active', state.direction === 'h');
  document.getElementById('btn-gap').classList.toggle('active', state.gapVisible);
}

function sendMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, msg);
  });
}

// Restore state from session storage on popup open
chrome.storage.session.get(['measure', 'guides', 'direction', 'gapVisible'], (saved) => {
  if (saved.measure    !== undefined) state.measure    = saved.measure;
  if (saved.guides     !== undefined) state.guides     = saved.guides;
  if (saved.direction  !== undefined) state.direction  = saved.direction;
  if (saved.gapVisible !== undefined) state.gapVisible = saved.gapVisible;
  syncUI();
});

// Tool toggle rows
document.querySelectorAll('.tool').forEach((row) => {
  row.addEventListener('click', () => {
    const tool = row.dataset.tool;
    state[tool] = !state[tool];
    chrome.storage.session.set({ [tool]: state[tool] });
    sendMessage({ tool, enabled: state[tool] });
    syncUI();
  });
});

// Direction buttons
document.getElementById('btn-v').addEventListener('click', () => {
  state.direction = 'v';
  chrome.storage.session.set({ direction: 'v' });
  sendMessage({ direction: 'v' });
  syncUI();
});
document.getElementById('btn-h').addEventListener('click', () => {
  state.direction = 'h';
  chrome.storage.session.set({ direction: 'h' });
  sendMessage({ direction: 'h' });
  syncUI();
});

// Gap toggle
document.getElementById('btn-gap').addEventListener('click', () => {
  state.gapVisible = !state.gapVisible;
  chrome.storage.session.set({ gapVisible: state.gapVisible });
  sendMessage({ gapVisible: state.gapVisible });
  syncUI();
});
