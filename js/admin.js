const API_BASE = 'https://championbackend.onrender.com/api';

let token = localStorage.getItem('adc_admin_token');
let categoriesCache = [];

function authHeaders() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  loadAll();
}

if (token) showApp();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    token = data.token;
    localStorage.setItem('adc_admin_token', token);
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('adc_admin_token');
  location.reload();
});

async function loadAll() {
  await loadSettings();
  await loadCategories();
  await loadPayments();
}

async function loadSettings() {
  const res = await fetch(`${API_BASE}/settings`);
  const settings = await res.json();
  document.getElementById('voteCostValue').textContent = settings.vote_cost || 20;
  const votingOpen = settings.voting_open !== 'false';
  document.getElementById('votingToggle').checked = votingOpen;
  document.getElementById('votingStatusText').textContent = votingOpen ? 'open' : 'closed';
}

document.getElementById('votingToggle').addEventListener('change', async (e) => {
  const open = e.target.checked;
  document.getElementById('votingStatusText').textContent = open ? 'open' : 'closed';
  await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ voting_open: open })
  });
});

document.getElementById('editVoteCostBtn').addEventListener('click', async () => {
  const newCost = prompt('New vote cost (KSh):');
  if (!newCost) return;
  await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ vote_cost: newCost })
  });
  loadSettings();
});

async function loadCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  categoriesCache = await res.json();
  renderCategoryManager();
}

function renderCategoryManager() {
  const container = document.getElementById('categoryManager');
  container.innerHTML = categoriesCache.map(cat => `
    <div class="category-block">
      <div class="category-block-head">
        <h4>${escapeHtml(cat.name)}</h4>
        <div class="category-actions">
          <button class="btn-ghost small" data-add-nominee="${cat.id}">+ Nominee</button>
          <button class="btn-ghost small" data-edit-category="${cat.id}">Edit</button>
          <button class="btn-ghost small" data-delete-category="${cat.id}">Delete</button>
        </div>
      </div>
      ${cat.nominees.length ? cat.nominees.map(n => `
        <div class="nominee-row">
          <span>${escapeHtml(n.full_name)} &mdash; ${n.vote_count || 0} votes</span>
          <span>
            <button class="btn-ghost small" data-edit-nominee="${n.id}" data-category-id="${cat.id}">Edit</button>
            <button class="btn-ghost small" data-delete-nominee="${n.id}">Delete</button>
          </span>
        </div>
      `).join('') : '<p class="empty-state">No nominees yet.</p>'}
    </div>
  `).join('');

  container.querySelectorAll('[data-add-nominee]').forEach(btn =>
    btn.addEventListener('click', () => openNomineeModal(null, btn.dataset.addNominee)));
  container.querySelectorAll('[data-edit-category]').forEach(btn =>
    btn.addEventListener('click', () => openCategoryModal(btn.dataset.editCategory)));
  container.querySelectorAll('[data-delete-category]').forEach(btn =>
    btn.addEventListener('click', () => deleteCategory(btn.dataset.deleteCategory)));
  container.querySelectorAll('[data-edit-nominee]').forEach(btn =>
    btn.addEventListener('click', () => openNomineeModal(btn.dataset.editNominee, btn.dataset.categoryId)));
  container.querySelectorAll('[data-delete-nominee]').forEach(btn =>
    btn.addEventListener('click', () => deleteNominee(btn.dataset.deleteNominee)));
}

// Category modal
document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal(null));

function openCategoryModal(categoryId) {
  const cat = categoriesCache.find(c => c.id === categoryId);
  document.getElementById('categoryId').value = categoryId || '';
  document.getElementById('categoryName').value = cat ? cat.name : '';
  document.getElementById('categoryDescription').value = cat ? (cat.description || '') : '';
  document.getElementById('categoryModal').classList.remove('hidden');
}

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value;
  const description = document.getElementById('categoryDescription').value;
  const url = id ? `${API_BASE}/categories/${id}` : `${API_BASE}/categories`;
  await fetch(url, {
    method: id ? 'PUT' : 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, description })
  });
  document.getElementById('categoryModal').classList.add('hidden');
  loadCategories();
});

async function deleteCategory(id) {
  if (!confirm('Delete this category and all its nominees?')) return;
  await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadCategories();
}

// Nominee modal
function openNomineeModal(nomineeId, categoryId) {
  let nominee = null;
  if (nomineeId) {
    const cat = categoriesCache.find(c => c.id === categoryId);
    nominee = cat?.nominees.find(n => n.id === nomineeId);
  }
  document.getElementById('nomineeId').value = nomineeId || '';
  document.getElementById('nomineeCategoryId').value = categoryId;
  document.getElementById('nomineeName').value = nominee ? nominee.full_name : '';
  document.getElementById('nomineeBio').value = nominee ? (nominee.bio || '') : '';
  document.getElementById('nomineePhoto').value = nominee ? (nominee.photo_url || '') : '';
  document.getElementById('nomineeModal').classList.remove('hidden');
}

document.getElementById('nomineeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('nomineeId').value;
  const category_id = document.getElementById('nomineeCategoryId').value;
  const full_name = document.getElementById('nomineeName').value;
  const bio = document.getElementById('nomineeBio').value;
  const photo_url = document.getElementById('nomineePhoto').value;
  const url = id ? `${API_BASE}/nominees/${id}` : `${API_BASE}/nominees`;
  await fetch(url, {
    method: id ? 'PUT' : 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category_id, full_name, bio, photo_url })
  });
  document.getElementById('nomineeModal').classList.add('hidden');
  loadCategories();
});

async function deleteNominee(id) {
  if (!confirm('Delete this nominee?')) return;
  await fetch(`${API_BASE}/nominees/${id}`, { method: 'DELETE', headers: authHeaders() });
  loadCategories();
}

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => document.getElementById(btn.dataset.closeModal).classList.add('hidden'));
});

// Payments
async function loadPayments() {
  const res = await fetch(`${API_BASE}/votes/admin/history`, { headers: authHeaders() });
  const data = await res.json();
  document.getElementById('totalRevenue').textContent = `KSh ${data.total_revenue.toLocaleString()}`;

  const tbody = document.querySelector('#paymentsTable tbody');
  tbody.innerHTML = data.transactions.slice(0, 50).map(t => `
    <tr>
      <td>${new Date(t.created_at).toLocaleString()}</td>
      <td>${escapeHtml(t.nominees?.full_name || '—')}</td>
      <td>${escapeHtml(t.categories?.name || '—')}</td>
      <td>${escapeHtml(t.phone_number)}</td>
      <td>${t.vote_count}</td>
      <td>KSh ${t.amount}</td>
      <td>${t.status}</td>
    </tr>
  `).join('');
}

document.getElementById('exportBtn').addEventListener('click', () => {
  fetch(`${API_BASE}/votes/admin/export`, { headers: authHeaders() })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'adc-payments.csv';
      a.click();
    });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
