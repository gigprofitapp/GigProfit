// ============================
// GIGPROFIT — DASHBOARD
// ============================

async function refreshDashboard() {
  if (!currentUser) return;

  const { startDate, endDate } = getPeriodDates(currentPeriod);

  // Fetch income
  const { data: incomeData } = await supabase
    .from('gp_income')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', startDate)
    .lte('date', endDate);

  // Fetch expenses
  const { data: expenseData } = await supabase
    .from('gp_expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', startDate)
    .lte('date', endDate);

  const income = incomeData || [];
  const expenses = expenseData || [];

  const currency = userProfile?.currency || 'USD';
  const country = userProfile?.country || 'US';
  const taxStatus = userProfile?.tax_status || 'single';
  const monthlyGoal = userProfile?.monthly_goal || 0;

  // Calculations
  const grossIncome = income.reduce((s, r) => s + parseFloat(r.amount || 0) + parseFloat(r.tips || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const netIncome = grossIncome - totalExpenses;
  const totalHours = income.reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const pph = totalHours > 0 ? netIncome / totalHours : 0;

  // Tax on gross income (simplified — real SE tax is on net profit)
  const taxableNet = Math.max(0, netIncome);
  const estTax = estimateTax(taxableNet / 12 * 12, country, taxStatus) / 12;
  const periodDivider = currentPeriod === 'today' ? 30 : currentPeriod === 'week' ? 4.33 : 1;
  const estTaxPeriod = estTax / periodDivider;
  const realProfit = netIncome - estTaxPeriod;

  // Update hero
  document.getElementById('dash-profit').textContent = fmtCurrency(realProfit, currency);
  document.getElementById('dash-income').textContent = fmtCurrency(grossIncome, currency);
  document.getElementById('dash-expenses').textContent = fmtCurrency(totalExpenses, currency);
  document.getElementById('dash-tax').textContent = fmtCurrency(estTaxPeriod, currency);
  document.getElementById('dash-hours').textContent = totalHours > 0 ? `${totalHours.toFixed(1)}h worked` : '0h worked';
  document.getElementById('dash-pph').textContent = `${fmtCurrency(pph, currency)}/hr`;

  // Goal progress (only for month)
  const goalTrack = document.getElementById('goal-track');
  if (monthlyGoal > 0) {
    const monthIncome = await getMonthIncome();
    const pct = Math.min(100, (monthIncome / monthlyGoal) * 100);
    document.getElementById('goal-track-fill').style.width = `${pct}%`;
    document.getElementById('goal-track-label').textContent = `${pct.toFixed(0)}% of ${fmtCurrency(monthlyGoal, currency)} monthly goal`;
    goalTrack.style.display = '';
  } else {
    goalTrack.style.display = 'none';
  }

  // Platform breakdown
  renderPlatformBreakdown(income, currency);

  // Recent activity
  renderRecentActivity(income, expenses, currency);
}

async function getMonthIncome() {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = todayISO();
  const { data } = await supabase
    .from('gp_income')
    .select('amount,tips')
    .eq('user_id', currentUser.id)
    .gte('date', start)
    .lte('date', end);
  return (data || []).reduce((s, r) => s + parseFloat(r.amount || 0) + parseFloat(r.tips || 0), 0);
}

function getPeriodDates(period) {
  const now = new Date();
  let startDate, endDate;
  endDate = todayISO();

  if (period === 'today') {
    startDate = todayISO();
  } else if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().split('T')[0];
  } else {
    // month
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return { startDate, endDate };
}

function renderPlatformBreakdown(income, currency) {
  const container = document.getElementById('platform-breakdown');
  if (!income || income.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">No income logged yet</div>';
    return;
  }

  // Group by platform
  const byPlatform = {};
  income.forEach(r => {
    const p = r.platform || 'other';
    if (!byPlatform[p]) byPlatform[p] = 0;
    byPlatform[p] += parseFloat(r.amount || 0) + parseFloat(r.tips || 0);
  });

  const maxAmt = Math.max(...Object.values(byPlatform));
  const sorted = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sorted.map(([platform, amt]) => {
    const info = PLATFORM_LABELS[platform] || { label: platform, emoji: '🔧' };
    const pct = maxAmt > 0 ? (amt / maxAmt) * 100 : 0;
    return `
      <div class="platform-bar-row">
        <div class="platform-bar-label">${info.emoji} ${info.label}</div>
        <div class="platform-bar-track"><div class="platform-bar-fill" style="width:${pct}%"></div></div>
        <div class="platform-bar-amount">${fmtCurrency(amt, currency)}</div>
      </div>
    `;
  }).join('');
}

function renderRecentActivity(income, expenses, currency) {
  const container = document.getElementById('recent-activity');

  // Merge and sort by date desc, take 5
  const items = [
    ...income.map(r => ({ ...r, type: 'income' })),
    ...expenses.map(r => ({ ...r, type: 'expense' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state-sm">Log your first trip or delivery</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    if (item.type === 'income') {
      const info = PLATFORM_LABELS[item.platform] || { label: item.platform, emoji: '🚗' };
      const total = parseFloat(item.amount || 0) + parseFloat(item.tips || 0);
      const meta = [
        item.hours ? `${item.hours}h` : null,
        item.miles ? `${item.miles} mi` : null,
        item.tips > 0 ? `+${fmtCurrency(item.tips, currency)} tips` : null
      ].filter(Boolean).join(' · ');
      return `
        <div class="activity-item">
          <div class="activity-icon">${info.emoji}</div>
          <div class="activity-info">
            <div class="activity-platform">${info.label}</div>
            <div class="activity-meta">${meta || 'Income'}</div>
          </div>
          <div class="activity-amount">${fmtCurrency(total, currency)}</div>
        </div>
      `;
    } else {
      const info = EXPENSE_LABELS[item.category] || { label: item.category, emoji: '📦' };
      return `
        <div class="activity-item">
          <div class="activity-icon">${info.emoji}</div>
          <div class="activity-info">
            <div class="activity-platform">${info.label}</div>
            <div class="activity-meta">${item.notes || 'Expense'} · ${fmtDate(item.date)}</div>
          </div>
          <div class="activity-amount expense">-${fmtCurrency(item.amount, currency)}</div>
        </div>
      `;
    }
  }).join('');
}
