const state = { measure: false, guides: false };

document.querySelectorAll('.tool').forEach((row) => {
  row.addEventListener('click', () => {
    const tool = row.dataset.tool;
    state[tool] = !state[tool];
    updateRow(row, state[tool]);
    sendMessage(tool, state[tool]);
  });
});

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
