const API_BASE = 'https://championbackend.onrender.com/api';

let selectedNominee = null;
let selectedCategory = null;
let voteCost = 20;

async function init() {
  try {
    const settingsRes = await fetch(`${API_BASE}/settings`);
    const settings = await settingsRes.json();
    voteCost = parseFloat(settings.vote_cost || '20');
    document.getElementById('voteCostDisplay').textContent = voteCost;

    const catRes = await fetch(`${API_BASE}/categories`);
    const categories = await catRes.json();
    renderCategories(categories);
  } catch (err) {
    document.getElementById('categories').innerHTML =
      '<p class="wrap empty-state">Unable to load categories right now. Please refresh.</p>';
    console.error(err);
  }
}

function renderCategories(categories) {
  const container = document.getElementById('categories');
  container.innerHTML = categories.map(cat => `
    <section class="category-section">
      <div class="wrap">
        <div class="category-heading">
          <h2>${escapeHtml(cat.name)}</h2>
          ${cat.description ? `<p>${escapeHtml(cat.description)}</p>` : ''}
        </div>
        <div class="nominee-grid">
          ${cat.nominees.length
            ? cat.nominees.map(n => nomineeCard(n, cat)).join('')
            : '<p class="empty-state">Nominees for this category will be announced soon.</p>'}
        </div>
      </div>
    </section>
  `).join('');

  document.querySelectorAll('.btn-vote').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.nomineeId, btn.dataset.nomineeName, btn.dataset.categoryId, btn.dataset.categoryName));
  });
}

function nomineeCard(nominee, category) {
  const photo = nominee.photo_url || 'images/placeholder.svg';
  return `
    <div class="nominee-card">
      <img class="nominee-photo" src="${photo}" alt="${escapeHtml(nominee.full_name)}" onerror="this.src='images/placeholder.svg'">
      <h4>${escapeHtml(nominee.full_name)}</h4>
      ${nominee.bio ? `<p class="nominee-bio">${escapeHtml(nominee.bio)}</p>` : ''}
      <p class="nominee-votes">${nominee.vote_count || 0} votes</p>
      <button class="btn-vote"
        data-nominee-id="${nominee.id}"
        data-nominee-name="${escapeHtml(nominee.full_name)}"
        data-category-id="${category.id}"
        data-category-name="${escapeHtml(category.name)}">
        Vote
      </button>
    </div>
  `;
}

function openModal(nomineeId, nomineeName, categoryId, categoryName) {
  selectedNominee = { id: nomineeId, name: nomineeName };
  selectedCategory = { id: categoryId, name: categoryName };

  document.getElementById('modalNomineeName').textContent = nomineeName;
  document.getElementById('modalCategoryName').textContent = categoryName;
  document.getElementById('voteCount').value = 1;
  document.getElementById('modalTotal').textContent = voteCost;
  document.getElementById('voteStatus').className = 'vote-status hidden';
  document.getElementById('voteForm').classList.remove('hidden');
  document.getElementById('voteModal').classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('voteModal').classList.add('hidden');
});

document.getElementById('voteCount').addEventListener('input', (e) => {
  const count = parseInt(e.target.value, 10) || 1;
  document.getElementById('modalTotal').textContent = count * voteCost;
});

document.getElementById('voteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const voteCount = parseInt(document.getElementById('voteCount').value, 10);
  const phoneNumber = document.getElementById('phoneNumber').value.trim();
  const submitBtn = document.getElementById('submitVoteBtn');
  const statusEl = document.getElementById('voteStatus');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const res = await fetch(`${API_BASE}/votes/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nominee_id: selectedNominee.id,
        category_id: selectedCategory.id,
        phone_number: phoneNumber,
        vote_count: voteCount
      })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Payment failed to start');

    statusEl.className = 'vote-status';
    statusEl.textContent = data.display_text || 'Check your phone and enter your M-Pesa PIN to complete payment.';
    document.getElementById('voteForm').classList.add('hidden');

    pollStatus(data.reference, statusEl);
  } catch (err) {
    statusEl.className = 'vote-status error';
    statusEl.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send STK push';
  }
});

function pollStatus(reference, statusEl) {
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    try {
      const res = await fetch(`${API_BASE}/votes/status/${reference}`);
      const data = await res.json();
      if (data.status === 'success') {
        clearInterval(interval);
        statusEl.textContent = `Payment confirmed — ${data.vote_count} vote(s) recorded. Thank you!`;
        setTimeout(() => {
          document.getElementById('voteModal').classList.add('hidden');
          init(); // refresh vote counts
        }, 2000);
      } else if (data.status === 'failed') {
        clearInterval(interval);
        statusEl.className = 'vote-status error';
        statusEl.textContent = 'Payment failed or was cancelled. Please try again.';
      }
    } catch (err) {
      // keep polling silently
    }
    if (attempts > 20) {
      clearInterval(interval);
      statusEl.textContent = 'Still waiting for confirmation — this can take a minute. You can close this and check back.';
    }
  }, 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

init();
