// ============================
// GIGPROFIT — EXPENSES
// ============================

function openAddExpense() {
  editingExpenseId = null;
  document.getElementById('expense-modal-title').textContent = 'Log Expense';
  document.getElementById('expense-category').value = 'gas';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-date').value = todayISO();
  document.getElementById('expense-notes').value = '';
  document.getElementById('expense-deductible-check').checked = true;
  openModal('add-expense-modal');
}

async function saveExpense() {
  const category = document.getElementById('expense-category').value;
  const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
  const date = document.getElementById('expense-date').value || todayISO();
  const notes = document.getElementById('expense-notes').value.trim();
  const isDeductible = document.getElementById('expense-deductible-check').checked;

  if (amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

  const record = {
    user_id: currentUser.id,
    category,
    amount,
    date,
    notes: notes || null,
    is_deductible: isDeductible,
  };

  let error;
  if (editingExpenseId) {
    ({ error } = await supabase.from('gp_expenses').update(record).eq('id', editingExpenseId));
  } else {
    ({ error } = await supabase.from('gp_expenses').insert(record));
  }

  if (error) { showToast('Error saving: ' + error.message, 'error'); return; }

  closeModal('add-expense-modal');
  showToast(editingExpenseId ? 'Expense updated!' : 'Expense logged! 🧾');
  editingExpenseId = null;
  refreshExpensePage();
  refreshDashboard();
}

async function refreshExpensePage() {
  if (!currentUser) return;
  const currency = userProfile?.currency || 'USD';

  // Month totals
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: monthData } = await supabase
    .from('gp_expenses')
    .select('amount,category,is_deductible')
    .eq('user_id', currentUser.id)
    .gte('date', startOfMonth)
    .lte('date', todayISO());

  const monthTotal = (monthData || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const gasTotal = (monthData || []).filter(r => r.category === 'gas').reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const deductibleTotal = (monthData || []).filter(r => r.is_deductible).reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  document.getElementById('expense-month-total').textContent = fmtCurrency(monthTotal, currency);
  document.getElementById('expense-month-gas').textContent = fmtCurrency(gasTotal, currency);
  document.getElementById('expense-deductible').textContent = fmtCurrency(deductibleTotal, currency);

  // All expenses (latest 50)
  const { data: allExpenses } = await supabase
    .from('gp_expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(50);

  renderExpenseList(allExpenses || [], currency);
}

function renderExpenseList(records, currency) {
  const container = document.getElementById('expense-list');
  if (!records.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><h3>No expenses logged</h3><p>Track gas, repairs, insurance & more</p></div>`;
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
    const dayTotal = items.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
    return `
      <div class="date-group-header">
        <span>${fmtDate(date)}</span>
        <span class="date-group-total expense-total">-${fmtCurrency(dayTotal, currency)}</span>
      </div>
      ${items.map(r => renderExpenseCard(r, currency)).join('')}
    `;
  }).join('');
}

function renderExpenseCard(r, currency) {
  const info = EXPENSE_LABELS[r.category] || { label: r.category, emoji: '📦' };
  const deductBadge = r.is_deductible ? '<span class="deduct-badge">deductible</span>' : '';

  return `
    <div class="entry-card" onclick="editExpense('${r.id}')">
      <div class="entry-card-icon">${info.emoji}</div>
      <div class="entry-card-info">
        <div class="entry-card-title">${info.label} ${deductBadge}</div>
        <div class="entry-card-meta">${r.notes || 'Expense'}</div>
      </div>
      <div class="entry-card-right">
        <div class="entry-card-amount expense">-${fmtCurrency(r.amount, currency)}</div>
        <div class="entry-card-date">${fmtDate(r.date)}</div>
      </div>
    </div>
  `;
}

async function editExpense(id) {
  const { data, error } = await supabase.from('gp_expenses').select('*').eq('id', id).single();
  if (error || !data) return;

  editingExpenseId = id;
  document.getElementById('expense-modal-title').textContent = 'Edit Expense';
  document.getElementById('expense-category').value = data.category || 'gas';
  document.getElementById('expense-amount').value = data.amount || '';
  document.getElementById('expense-date').value = data.date || todayISO();
  document.getElementById('expense-notes').value = data.notes || '';
  document.getElementById('expense-deductible-check').checked = data.is_deductible !== false;
  openModal('add-expense-modal');
}

// Deductible badge styles
const expenseStyles = document.createElement('style');
expenseStyles.textContent = `
  .deduct-badge {
    display: inline-block; font-size: 0.65rem; font-weight: 700;
    background: rgba(0,212,170,0.15); color: var(--income-color);
    padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
    letter-spacing: 0.3px; margin-left: 6px; vertical-align: middle;
  }
  .date-group-total.expense-total { color: var(--expense-color); }
`;
document.head.appendChild(expenseStyles);
