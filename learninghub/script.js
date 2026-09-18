const tabs = document.querySelectorAll('.nav-tab');
const cards = [...document.querySelectorAll('.resource-card')];
const search = document.querySelector('#resource-search');
const emptyState = document.querySelector('#empty-state');
const recentList = document.querySelector('#recent-list');
const recentKey = 'pierce-learning-hub-recent';
let activeFilter = 'all';

function recentResources() {
  try { return JSON.parse(localStorage.getItem(recentKey)) || []; } catch { return []; }
}

function renderRecent() {
  const items = recentResources();
  if (!items.length) {
    recentList.innerHTML = '<p class="recent-empty">Your recent resources will appear here.</p>';
    return;
  }
  recentList.innerHTML = items.map(item => `<span class="recent-item"><span>↗</span>${item}</span>`).join('');
}

function filterCards() {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const matchesFilter = activeFilter === 'all' || card.dataset.category === activeFilter;
    const matchesSearch = !query || `${card.dataset.name} ${card.textContent}`.toLowerCase().includes(query);
    const show = matchesFilter && matchesSearch;
    card.hidden = !show;
    if (show) visible++;
  });
  emptyState.hidden = visible > 0;
}

tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  tab.classList.add('active');
  activeFilter = tab.dataset.filter;
  filterCards();
}));

search.addEventListener('input', filterCards);
cards.forEach(card => card.addEventListener('click', () => {
  const items = [card.dataset.resource, ...recentResources().filter(item => item !== card.dataset.resource)].slice(0, 4);
  localStorage.setItem(recentKey, JSON.stringify(items));
  renderRecent();
}));

renderRecent();
