const state = { measure: false, guides: false };

// Sync UI rows to current state object
function syncUI() {
  document.querySelectorAll('.tool').forEach((row) => {
    const tool = row.dataset.tool;
    updateRow(row, state[tool]);
  });
}

function updateRow(row, enabled) {
  const badge = row.querySelector('.badge');
  if (enabled) {
    row.classList.add('active');
    badge.textContent = 'ON';
  } else {
    row.classList.remove('active');
    badge.textContent = 'OFF';
  }
}

function sendMessage(tool, enabled) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { tool, enabled });
  });
}

// Restore state from session storage on popup open
chrome.storage.session.get(['measure', 'guides'], (saved) => {
  if (saved.measure !== undefined) state.measure = saved.measure;
  if (saved.guides  !== undefined) state.guides  = saved.guides;
  syncUI();
});

// Wire up click handlers
document.querySelectorAll('.tool').forEach((row) => {
  row.addEventListener('click', () => {
    const tool = row.dataset.tool;
    state[tool] = !state[tool];
    updateRow(row, state[tool]);
    chrome.storage.session.set({ [tool]: state[tool] });
    sendMessage(tool, state[tool]);
  });
});
