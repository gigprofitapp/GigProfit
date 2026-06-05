// ============================
// GIGPROFIT — INCOME
// ============================

function openAddIncome() {
  editingIncomeId = null;
  document.getElementById('income-modal-title').textContent = 'Log Income';
  document.getElementById('income-platform').value = '';
  document.getElementById('income-amount').value = '';
  document.getElementById('income-tips').value = '';
  document.getElementById('income-hours').value = '';
  document.getElementById('income-miles').value = '';
  document.getElementById('income-date').value = todayISO();
  document.getElementById('income-notes').value = '';

  // Populate platform dropdown from profile
  populatePlatformDropdown();
  openModal('add-income-modal');
}

async function saveIncome() {
  const platform = document.getElementById('income-platform').value;
  const amount = parseFloat(document.getElementById('income-amount').value) || 0;
  const tips = parseFloat(document.getElementById('income-tips').value) || 0;
  const hours = parseFloat(document.getElementById('income-hours').value) || 0;
  const miles = parseFloat(document.getElementById('income-miles').value) || 0;
  const date = document.getElementById('income-date').value || todayISO();
  const notes = document.getElementById('income-notes').value.trim();

  if (!platform) { showToast('Please select a platform', 'error'); return; }
  if (amount <= 0 && tips <= 0) { showToast('Enter an amount or tips', 'error'); return; }

  const record = {
    user_id: currentUser.id,
    platform,
    amount,
    tips,
    hours: hours || null,
    miles: miles || null,
    date,
    notes: notes || null,
  };

  let error;
  if (editingIncomeId) {
    ({ error } = await supabase.from('gp_income').update(record).eq('id', editingIncomeId));
  } else {
    ({ error } = await supabase.from('gp_income').insert(record));
  }

  if (error) { showToast('Error saving: ' + error.message, 'error'); return; }

  closeModal('add-income-modal');
  showToast(editingIncomeId ? 'Income updated!' : 'Income logged! 💰');
  editingIncomeId = null;
  refreshIncomePage();
  refreshDashboard();
}

async function refreshIncomePage() {
  if (!currentUser) return;
  const currency = userProfile?.currency || 'USD';

  // Month totals
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: monthData } = await supabase
    .from('gp_income')
    .select('amount,tips,miles')
    .eq('user_id', currentUser.id)
    .gte('date', startOfMonth)
    .lte('date', todayISO());

  const monthIncome = (monthData || []).reduce((s, r) => s + parseFloat(r.amount || 0) + parseFloat(r.tips || 0), 0);
  const monthMiles = (monthData || []).reduce((s, r) => s + parseFloat(r.miles || 0), 0);
  const monthTips = (monthData || []).reduce((s, r) => s + parseFloat(r.tips || 0), 0);

  document.getElementById('income-month-total').textContent = fmtCurrency(monthIncome, currency);
  document.getElementById('income-month-miles').textContent = `${monthMiles.toFixed(0)} mi`;
  document.getElementById('income-month-tips').textContent = fmtCurrency(monthTips, currency);

  // All income (latest 50)
  const { data: allIncome } = await supabase
    .from('gp_income')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(50);

  renderIncomeList(allIncome || [], currency);
  populatePlatformDropdown();
}

function renderIncomeList(records, currency) {
  const container = document.getElementById('income-list');
  if (!records.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><h3>No income logged</h3><p>Tap "+ Add" to log your first earnings</p></div>`;
    return;
  }

  // Group by date
  const byDate = {};
  records.forEach(r => {
    const d = r.date || todayISO();
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r);
  });

  container.innerHTML = Object.entries(byDate).map(([date, items]) => {
    const dayTotal = items.reduce((s, r) => s + parseFloat(r.amount || 0) + parseFloat(r.tips || 0), 0);
    return `
      <div class="date-group-header">
        <span>${fmtDate(date)}</span>
        <span class="date-group-total">${fmtCurrency(dayTotal, currency)}</span>
      </div>
      ${items.map(r => renderIncomeCard(r, currency)).join('')}
    `;
  }).join('');
}

function renderIncomeCard(r, currency) {
  const info = PLATFORM_LABELS[r.platform] || { label: r.platform, emoji: '🚗' };
  const total = parseFloat(r.amount || 0) + parseFloat(r.tips || 0);
  const meta = [
    r.hours ? `${r.hours}h` : null,
    r.miles ? `${r.miles} mi` : null,
    r.tips > 0 ? `+${fmtCurrency(r.tips, currency)} tips` : null,
    r.notes || null
  ].filter(Boolean).join(' · ');

  return `
    <div class="entry-card" onclick="editIncome('${r.id}')">
      <div class="entry-card-icon">${info.emoji}</div>
      <div class="entry-card-info">
        <div class="entry-card-title">${info.label}</div>
        <div class="entry-card-meta">${meta || 'Income'}</div>
      </div>
      <div class="entry-card-right">
        <div class="entry-card-amount income">${fmtCurrency(total, currency)}</div>
        <div class="entry-card-date">${fmtDate(r.date)}</div>
      </div>
    </div>
  `;
}

async function editIncome(id) {
  const { data, error } = await supabase.from('gp_income').select('*').eq('id', id).single();
  if (error || !data) return;

  editingIncomeId = id;
  document.getElementById('income-modal-title').textContent = 'Edit Income';
  populatePlatformDropdown();
  document.getElementById('income-platform').value = data.platform || '';
  document.getElementById('income-amount').value = data.amount || '';
  document.getElementById('income-tips').value = data.tips || '';
  document.getElementById('income-hours').value = data.hours || '';
  document.getElementById('income-miles').value = data.miles || '';
  document.getElementById('income-date').value = data.date || todayISO();
  document.getElementById('income-notes').value = data.notes || '';
  openModal('add-income-modal');
}

// Add date group header styles dynamically
const incomeStyles = document.createElement('style');
incomeStyles.textContent = `
  .date-group-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 4px 6px;
    font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--text-muted);
  }
  .date-group-total { color: var(--income-color); font-family: var(--font-display); }
`;
document.head.appendChild(incomeStyles);
