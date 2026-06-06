// ============================================================
// GIGPROFIT — COMPLETE APP v3
// Fixes: onboarding, edit/delete, empty states, loading states
// ============================================================

const SUPABASE_URL = 'https://avydceapvbefcaquvazq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWRjZWFwdmJlZmNhcXV2YXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MTU2OTYsImV4cCI6MjA5NjE5MTY5Nn0.VKU-cx37t9Np7DB_1T7kPVeGmkp_CZEEgeo0dqe4BPQ';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let userProfile = null;
let currentPage = 'dashboard';
let editingId = null;

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
  } else {
    showPage('auth');
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfile();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userProfile = null;
      showPage('auth');
    }
  });

  // theme
  const saved = localStorage.getItem('gp-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
});

// ── THEME ─────────────────────────────────────────────────
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gp-theme', next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme) {
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ── AUTH ──────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(tab + 'Form').classList.add('active');
}

async function signIn() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('signInBtn');
  if (!email || !password) return showToast('Please enter email and password', 'error');
  setLoading(btn, true, 'Signing in...');
  const { error } = await db.auth.signInWithPassword({ email, password });
  setLoading(btn, false, 'Sign In');
  if (error) showToast(error.message, 'error');
}

async function signUp() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const btn = document.getElementById('signUpBtn');
  if (!name || !email || !password) return showToast('Please fill all fields', 'error');
  if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
  setLoading(btn, true, 'Creating account...');
  const { error } = await db.auth.signUp({ email, password, options: { data: { full_name: name } } });
  setLoading(btn, false, 'Create Account');
  if (error) showToast(error.message, 'error');
  else showToast('Account created! Check your email to confirm.', 'success');
}

async function signInWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://gigprofitapp.github.io/GigProfit/' }
  });
  if (error) showToast(error.message, 'error');
}

async function signOut() {
  await db.auth.signOut();
}

// ── PROFILE ───────────────────────────────────────────────
async function loadProfile() {
  const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data;
  if (!userProfile || !userProfile.onboarding_done) {
    startOnboarding();
  } else {
    showPage('dashboard');
  }
}

// ── ONBOARDING ────────────────────────────────────────────
let onboardingData = { platforms: [], country: 'US', currency: 'USD', tax_status: 'single', monthly_goal: 3000 };
let onboardingStep = 1;

function startOnboarding() {
  onboardingStep = 1;
  onboardingData = { platforms: [], country: 'US', currency: 'USD', tax_status: 'single', monthly_goal: 3000 };
  showPage('onboarding');
  showOnboardingStep(1);
}

function showOnboardingStep(step) {
  document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('step' + step);
  if (el) el.classList.add('active');
  // update dots
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === step);
    d.classList.toggle('done', i + 1 < step);
  });
}

function togglePlatform(el, platform) {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) {
    if (!onboardingData.platforms.includes(platform)) onboardingData.platforms.push(platform);
  } else {
    onboardingData.platforms = onboardingData.platforms.filter(p => p !== platform);
  }
}

function nextOnboarding(step) {
  if (step === 2 && onboardingData.platforms.length === 0) {
    return showToast('Please select at least one platform', 'error');
  }
  if (step === 3) {
    onboardingData.country = document.getElementById('countrySelect').value;
    onboardingData.currency = document.getElementById('currencySelect').value;
  }
  if (step === 4) {
    onboardingData.tax_status = document.getElementById('taxStatus').value;
  }
  onboardingStep = step;
  showOnboardingStep(step);
}

function prevOnboarding(step) {
  onboardingStep = step;
  showOnboardingStep(step);
}

async function finishOnboarding() {
  const goalVal = document.getElementById('monthlyGoal').value;
  onboardingData.monthly_goal = parseFloat(goalVal) || 3000;
  const btn = document.getElementById('finishOnboardingBtn');
  setLoading(btn, true, 'Setting up...');

  const profileData = {
    user_id: currentUser.id,
    full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
    country: onboardingData.country,
    currency: onboardingData.currency,
    tax_status: onboardingData.tax_status,
    platforms: onboardingData.platforms,
    monthly_goal: onboardingData.monthly_goal,
    onboarding_done: true
  };

  const { error } = await db.from('profiles').upsert(profileData, { onConflict: 'user_id' });
  setLoading(btn, false, 'Get Started →');
  if (error) { showToast('Error saving profile: ' + error.message, 'error'); return; }

  const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data;
  showPage('dashboard');
}

// ── NAVIGATION ────────────────────────────────────────────
function showPage(page) {
  currentPage = page;
  const appPages = ['dashboard', 'income', 'expenses', 'mileage', 'profile'];
  const isAppPage = appPages.includes(page);
  const shell = document.getElementById('appShell');

  if (isAppPage) {
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('onboardingPage').classList.remove('active');
    shell.classList.add('visible');
    document.querySelectorAll('.app-shell .page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(page + 'Page');
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[onclick*="${page}"]`);
    if (navEl) navEl.classList.add('active');
  } else {
    shell.classList.remove('visible');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById(page + 'Page');
    if (el) el.classList.add('active');
  }

  if (page === 'dashboard') loadDashboard();
  if (page === 'income') loadIncome();
  if (page === 'expenses') loadExpenses();
  if (page === 'mileage') loadMileage();
  if (page === 'profile') loadProfilePage();
}

// ── DASHBOARD ─────────────────────────────────────────────
let dashPeriod = 'today';

function setDashPeriod(period, el) {
  dashPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadDashboard();
}

async function loadDashboard() {
  if (!currentUser) return;
  const name = userProfile?.full_name || currentUser.email.split('@')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dashGreeting').textContent = greeting;
  document.getElementById('dashName').textContent = name;

  const { start, end } = getDateRange(dashPeriod);

  const [{ data: income }, { data: expenses }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end)
  ]);

  const gross = (income || []).reduce((s, r) => s + parseFloat(r.amount) + parseFloat(r.tips || 0), 0);
  const exp = (expenses || []).reduce((s, r) => s + parseFloat(r.amount), 0);
  const hours = (income || []).reduce((s, r) => s + parseFloat(r.hours || 0), 0);
  const country = userProfile?.country || 'US';
  const taxRate = country === 'CA' ? 0.28 : 0.153;
  const taxBase = Math.max(0, gross - exp);
  const tax = taxBase * 0.9235 * taxRate;
  const profit = gross - exp - tax;
  const hourly = hours > 0 ? profit / hours : 0;

  document.getElementById('realProfit').textContent = fmt(profit);
  document.getElementById('grossIncome').textContent = fmt(gross);
  document.getElementById('totalExpenses').textContent = fmt(exp);
  document.getElementById('estTax').textContent = fmt(tax);
  document.getElementById('hoursWorked').textContent = hours > 0 ? `${hours.toFixed(1)}h worked` : '';
  document.getElementById('hourlyRate').textContent = hours > 0 ? `${fmt(hourly)}/hr` : '';

  // goal progress
  const goal = userProfile?.monthly_goal || 0;
  if (goal > 0) {
    const pct = Math.min(100, (profit / goal) * 100);
    document.getElementById('goalProgress').style.width = pct + '%';
    document.getElementById('goalText').textContent = `${Math.round(pct)}% of ${fmt(goal)} monthly goal`;
  }

  // platform breakdown
  const byPlatform = {};
  (income || []).forEach(r => {
    const p = r.platform;
    byPlatform[p] = (byPlatform[p] || 0) + parseFloat(r.amount) + parseFloat(r.tips || 0);
  });
  const platformHTML = Object.keys(byPlatform).length === 0
    ? '<p class="empty-state">No income logged yet</p>'
    : Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).map(([p, amt]) => `
      <div class="platform-row">
        <span class="platform-name">${p}</span>
        <span class="platform-amt">${fmt(amt)}</span>
      </div>`).join('');
  document.getElementById('platformBreakdown').innerHTML = platformHTML;

  // recent activity
  const allActivity = [
    ...(income || []).map(r => ({ ...r, type: 'income', sortDate: r.date })),
    ...(expenses || []).map(r => ({ ...r, type: 'expense', sortDate: r.date }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const actHTML = allActivity.length === 0
    ? '<p class="empty-state">No recent activity. Start by logging your first income! 💰</p>'
    : allActivity.map(r => `
      <div class="activity-row">
        <div class="activity-info">
          <span class="activity-label">${r.type === 'income' ? r.platform : r.category}</span>
          <span class="activity-date">${formatDate(r.date)}</span>
        </div>
        <span class="activity-amt ${r.type === 'income' ? 'positive' : 'negative'}">
          ${r.type === 'income' ? '+' : '-'}${fmt(parseFloat(r.amount) + (r.type === 'income' ? parseFloat(r.tips||0) : 0))}
        </span>
      </div>`).join('');
  document.getElementById('recentActivity').innerHTML = actHTML;

  drawChart();
}

async function drawChart() {
  const canvas = document.getElementById('earningsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const days = [];
  const labels = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push(dateStr);
    labels.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]);
  }

  const [{ data: income }, { data: expenses }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', days[0]).lte('date', days[6]),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', days[0]).lte('date', days[6])
  ]);

  days.forEach(d => {
    const inc = (income||[]).filter(r => r.date === d).reduce((s,r) => s + parseFloat(r.amount) + parseFloat(r.tips||0), 0);
    const exp = (expenses||[]).filter(r => r.date === d).reduce((s,r) => s + parseFloat(r.amount), 0);
    incomeData.push(inc);
    expenseData.push(exp);
  });

  const maxVal = Math.max(...incomeData, ...expenseData, 1);
  const W = canvas.width, H = canvas.height;
  const padL = 10, padR = 10, padT = 30, padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const barW = (chartW / 7) * 0.35;
  const gap = (chartW / 7) * 0.05;

  ctx.clearRect(0, 0, W, H);

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const today = new Date().toISOString().split('T')[0];

  // grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
  }

  days.forEach((d, i) => {
    const x = padL + (chartW / 7) * i + (chartW / 7) * 0.15;
    const isToday = d === today;

    // income bar
    const incH = (incomeData[i] / maxVal) * chartH;
    const incGrad = ctx.createLinearGradient(0, padT + chartH - incH, 0, padT + chartH);
    incGrad.addColorStop(0, isToday ? '#00d4aa' : 'rgba(0,212,170,0.7)');
    incGrad.addColorStop(1, isToday ? 'rgba(0,212,170,0.3)' : 'rgba(0,212,170,0.2)');
    ctx.fillStyle = incGrad;
    ctx.beginPath();
    ctx.roundRect(x, padT + chartH - incH, barW, incH, 4);
    ctx.fill();

    // expense bar
    const expH = (expenseData[i] / maxVal) * chartH;
    if (expH > 0) {
      ctx.fillStyle = 'rgba(255,99,99,0.6)';
      ctx.beginPath();
      ctx.roundRect(x + barW + gap, padT + chartH - expH, barW, expH, 4);
      ctx.fill();
    }

    // value label
    if (incomeData[i] > 0) {
      ctx.fillStyle = '#00d4aa';
      ctx.font = `bold 10px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('$' + Math.round(incomeData[i]), x + barW / 2, padT + chartH - incH - 5);
    }

    // day label
    ctx.fillStyle = isToday ? '#00d4aa' : textColor;
    ctx.font = isToday ? 'bold 11px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, H - 8);
  });
}

// ── INCOME ────────────────────────────────────────────────
async function loadIncome() {
  if (!currentUser) return;
  const list = document.getElementById('incomeList');
  list.innerHTML = '<p class="empty-state loading">Loading...</p>';

  const { data } = await db.from('gp_income').select('*').eq('user_id', currentUser.id).order('date', { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">💰</div>
        <h3>No income yet</h3>
        <p>Tap the + button to log your first earnings</p>
      </div>`;
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="entry-card">
      <div class="entry-main">
        <div class="entry-info">
          <span class="entry-platform">${r.platform}</span>
          <span class="entry-date">${formatDate(r.date)}</span>
          ${r.hours ? `<span class="entry-meta">⏱ ${r.hours}h</span>` : ''}
          ${r.miles ? `<span class="entry-meta">🚗 ${r.miles}mi</span>` : ''}
          ${r.notes ? `<span class="entry-notes">${r.notes}</span>` : ''}
        </div>
        <div class="entry-amounts">
          <span class="entry-amount">${fmt(parseFloat(r.amount))}</span>
          ${r.tips > 0 ? `<span class="entry-tips">+${fmt(parseFloat(r.tips))} tips</span>` : ''}
        </div>
      </div>
      <div class="entry-actions">
        <button class="btn-edit" onclick="editIncome('${r.id}')">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteIncome('${r.id}')">🗑️ Delete</button>
      </div>
    </div>`).join('');
}

function showAddIncome() {
  editingId = null;
  document.getElementById('incomeModalTitle').textContent = 'Log Income';
  document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('incomePlatform').value = userProfile?.platforms?.[0] || 'Uber';
  document.getElementById('incomeAmount').value = '';
  document.getElementById('incomeTips').value = '';
  document.getElementById('incomeHours').value = '';
  document.getElementById('incomeMiles').value = '';
  document.getElementById('incomeNotes').value = '';
  document.getElementById('incomeModal').classList.add('active');
}

async function editIncome(id) {
  const { data } = await db.from('gp_income').select('*').eq('id', id).single();
  if (!data) return;
  editingId = id;
  document.getElementById('incomeModalTitle').textContent = 'Edit Income';
  document.getElementById('incomeDate').value = data.date;
  document.getElementById('incomePlatform').value = data.platform;
  document.getElementById('incomeAmount').value = data.amount;
  document.getElementById('incomeTips').value = data.tips || '';
  document.getElementById('incomeHours').value = data.hours || '';
  document.getElementById('incomeMiles').value = data.miles || '';
  document.getElementById('incomeNotes').value = data.notes || '';
  document.getElementById('incomeModal').classList.add('active');
}

async function deleteIncome(id) {
  if (!confirm('Delete this income entry?')) return;
  const { error } = await db.from('gp_income').delete().eq('id', id);
  if (error) showToast('Error deleting entry', 'error');
  else { showToast('Entry deleted', 'success'); loadIncome(); }
}

async function saveIncome() {
  const btn = document.getElementById('saveIncomeBtn');
  const platform = document.getElementById('incomePlatform').value;
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const tips = parseFloat(document.getElementById('incomeTips').value) || 0;
  const hours = parseFloat(document.getElementById('incomeHours').value) || null;
  const miles = parseFloat(document.getElementById('incomeMiles').value) || null;
  const date = document.getElementById('incomeDate').value;
  const notes = document.getElementById('incomeNotes').value.trim();

  if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
  if (!date) return showToast('Please select a date', 'error');

  setLoading(btn, true, 'Saving...');

  const record = { user_id: currentUser.id, platform, amount, tips, hours, miles, date, notes };
  let error;
  if (editingId) {
    ({ error } = await db.from('gp_income').update(record).eq('id', editingId));
  } else {
    ({ error } = await db.from('gp_income').insert(record));
  }

  setLoading(btn, false, 'Save');
  if (error) { showToast('Error saving: ' + error.message, 'error'); return; }
  showToast(editingId ? 'Income updated!' : 'Income saved!', 'success');
  closeModal('incomeModal');
  loadIncome();
}

// ── EXPENSES ──────────────────────────────────────────────
async function loadExpenses() {
  if (!currentUser) return;
  const list = document.getElementById('expenseList');
  list.innerHTML = '<p class="empty-state loading">Loading...</p>';

  const { data } = await db.from('gp_expenses').select('*').eq('user_id', currentUser.id).order('date', { ascending: false });

  if (!data || data.length === 0) {
    list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">📋</div>
        <h3>No expenses yet</h3>
        <p>Track gas, repairs, insurance and more to calculate your real profit</p>
      </div>`;
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="entry-card">
      <div class="entry-main">
        <div class="entry-info">
          <span class="entry-platform">${r.category}</span>
          <span class="entry-date">${formatDate(r.date)}</span>
          ${r.is_deductible ? '<span class="entry-badge">Tax deductible</span>' : ''}
          ${r.notes ? `<span class="entry-notes">${r.notes}</span>` : ''}
        </div>
        <div class="entry-amounts">
          <span class="entry-amount negative">${fmt(parseFloat(r.amount))}</span>
        </div>
      </div>
      <div class="entry-actions">
        <button class="btn-edit" onclick="editExpense('${r.id}')">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteExpense('${r.id}')">🗑️ Delete</button>
      </div>
    </div>`).join('');
}

function showAddExpense() {
  editingId = null;
  document.getElementById('expenseModalTitle').textContent = 'Add Expense';
  document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('expenseCategory').value = 'Gas';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseNotes').value = '';
  document.getElementById('expenseDeductible').checked = true;
  document.getElementById('expenseModal').classList.add('active');
}

async function editExpense(id) {
  const { data } = await db.from('gp_expenses').select('*').eq('id', id).single();
  if (!data) return;
  editingId = id;
  document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
  document.getElementById('expenseDate').value = data.date;
  document.getElementById('expenseCategory').value = data.category;
  document.getElementById('expenseAmount').value = data.amount;
  document.getElementById('expenseNotes').value = data.notes || '';
  document.getElementById('expenseDeductible').checked = data.is_deductible;
  document.getElementById('expenseModal').classList.add('active');
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  const { error } = await db.from('gp_expenses').delete().eq('id', id);
  if (error) showToast('Error deleting entry', 'error');
  else { showToast('Expense deleted', 'success'); loadExpenses(); }
}

async function saveExpense() {
  const btn = document.getElementById('saveExpenseBtn');
  const category = document.getElementById('expenseCategory').value;
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  const notes = document.getElementById('expenseNotes').value.trim();
  const is_deductible = document.getElementById('expenseDeductible').checked;

  if (!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
  if (!date) return showToast('Please select a date', 'error');

  setLoading(btn, true, 'Saving...');
  const record = { user_id: currentUser.id, category, amount, date, notes, is_deductible };
  let error;
  if (editingId) {
    ({ error } = await db.from('gp_expenses').update(record).eq('id', editingId));
  } else {
    ({ error } = await db.from('gp_expenses').insert(record));
  }

  setLoading(btn, false, 'Save');
  if (error) { showToast('Error saving: ' + error.message, 'error'); return; }
  showToast(editingId ? 'Expense updated!' : 'Expense saved!', 'success');
  closeModal('expenseModal');
  loadExpenses();
}

// ── MILEAGE ───────────────────────────────────────────────
async function loadMileage() {
  if (!currentUser) return;
  const country = userProfile?.country || 'US';
  const rate = country === 'CA' ? 0.70 : 0.70;
  const rateLabel = country === 'CA' ? '$0.70/km (CRA 2026)' : '$0.70/mile (IRS 2026)';
  const unit = country === 'CA' ? 'km' : 'mi';
  const year = new Date().getFullYear();

  document.getElementById('irsRate').textContent = rateLabel;
  document.getElementById('mileageYear').textContent = year;

  // this month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0];

  const [{ data: monthData }, { data: yearData }] = await Promise.all([
    db.from('gp_income').select('miles, date, platform, amount').eq('user_id', currentUser.id).gte('date', monthStart).lte('date', monthEnd).not('miles', 'is', null),
    db.from('gp_income').select('miles, date, platform').eq('user_id', currentUser.id).gte('date', `${year}-01-01`).not('miles', 'is', null)
  ]);

  const monthMiles = (monthData||[]).reduce((s,r) => s + parseFloat(r.miles||0), 0);
  const yearMiles = (yearData||[]).reduce((s,r) => s + parseFloat(r.miles||0), 0);
  const monthDeduction = monthMiles * rate;
  const yearDeduction = yearMiles * rate;

  document.getElementById('monthMiles').textContent = monthMiles.toFixed(1);
  document.getElementById('monthUnit').textContent = unit;
  document.getElementById('monthDeduction').textContent = fmt(monthDeduction);
  document.getElementById('yearMiles').textContent = yearMiles.toFixed(1) + ' ' + unit;
  document.getElementById('yearDeduction').textContent = fmt(yearDeduction);

  // trips list
  const list = document.getElementById('tripsList');
  if (!monthData || monthData.length === 0) {
    list.innerHTML = `
      <div class="empty-state-card">
        <div class="empty-icon">🚗</div>
        <h3>No mileage logged this month</h3>
        <p>When you log income, add the miles you drove to track your tax deduction</p>
      </div>`;
    return;
  }

  list.innerHTML = monthData.sort((a,b) => new Date(b.date)-new Date(a.date)).map(r => `
    <div class="trip-row">
      <div class="trip-info">
        <span class="trip-platform">${r.platform}</span>
        <span class="trip-date">${formatDate(r.date)}</span>
      </div>
      <div class="trip-amounts">
        <span class="trip-miles">${parseFloat(r.miles).toFixed(1)} ${unit}</span>
        <span class="trip-deduction">~${fmt(parseFloat(r.miles) * rate)} est. deduction</span>
      </div>
    </div>`).join('');
}

// ── PROFILE PAGE ──────────────────────────────────────────
async function loadProfilePage() {
  if (!userProfile) return;
  document.getElementById('profileName').textContent = userProfile.full_name || 'Driver';
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileCountry').textContent = userProfile.country === 'CA' ? '🇨🇦 Canada' : '🇺🇸 United States';
  document.getElementById('profileCurrency').textContent = userProfile.currency || 'USD';
  document.getElementById('profileGoal').textContent = fmt(userProfile.monthly_goal || 0);
  document.getElementById('profilePlatforms').textContent = (userProfile.platforms || []).join(', ') || 'None set';
}

// ── HELPERS ───────────────────────────────────────────────
function getDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (period === 'today') return { start: today, end: today };
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    return { start: mon.toISOString().split('T')[0], end: today };
  }
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  return { start: monthStart, end: today };
}

function fmt(n) {
  const num = parseFloat(n) || 0;
  return '$' + Math.abs(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  editingId = null;
}

function setLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? text : btn.dataset.label || text;
  if (!loading && !btn.dataset.label) btn.dataset.label = text;
}

function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ── EXPORT ────────────────────────────────────────────────

async function exportData(type) {
  if (!currentUser) return;
  showToast('Preparing export...', 'success');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Fetch all data for current year
  const [{ data: income }, { data: expenses }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id)
      .gte('date', `${year}-01-01`).order('date', { ascending: false }),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id)
      .gte('date', `${year}-01-01`).order('date', { ascending: false })
  ]);

  if (type === 'csv') exportCSV(income || [], expenses || [], year);
  if (type === 'pdf') exportPDF(income || [], expenses || [], year);
}

function exportCSV(income, expenses, year) {
  // Income CSV
  const incomeRows = [
    ['Date', 'Platform', 'Earnings', 'Tips', 'Total', 'Hours', 'Miles', 'Notes'],
    ...income.map(r => [
      r.date, r.platform,
      parseFloat(r.amount).toFixed(2),
      parseFloat(r.tips || 0).toFixed(2),
      (parseFloat(r.amount) + parseFloat(r.tips || 0)).toFixed(2),
      r.hours || '', r.miles || '', r.notes || ''
    ])
  ];

  // Expense CSV
  const expenseRows = [
    ['Date', 'Category', 'Amount', 'Tax Deductible', 'Notes'],
    ...expenses.map(r => [
      r.date, r.category,
      parseFloat(r.amount).toFixed(2),
      r.is_deductible ? 'Yes' : 'No',
      r.notes || ''
    ])
  ];

  const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount) + parseFloat(r.tips || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalMiles = income.reduce((s, r) => s + parseFloat(r.miles || 0), 0);
  const mileageDeduction = totalMiles * 0.70;
  const netProfit = totalIncome - totalExpenses;

  const summaryRows = [
    ['SUMMARY', ''],
    ['Total Income', totalIncome.toFixed(2)],
    ['Total Expenses', totalExpenses.toFixed(2)],
    ['Total Miles', totalMiles.toFixed(1)],
    ['Mileage Deduction', mileageDeduction.toFixed(2)],
    ['Net Profit', netProfit.toFixed(2)],
    ['Est. Self-Employment Tax (15.3%)', (netProfit * 0.9235 * 0.153).toFixed(2)]
  ];

  const csvContent = [
    [`GIGPROFIT TAX REPORT - ${year}`],
    [],
    ['=== INCOME ==='],
    ...incomeRows,
    [],
    ['=== EXPENSES ==='],
    ...expenseRows,
    [],
    ['=== SUMMARY ==='],
    ...summaryRows
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  downloadFile(`GigProfit-${year}-Tax-Report.csv`, csvContent, 'text/csv');
  showToast('CSV exported!', 'success');
}

function exportPDF(income, expenses, year) {
  const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount) + parseFloat(r.tips || 0), 0);
  const totalExpenses = expenses.reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalMiles = income.reduce((s, r) => s + parseFloat(r.miles || 0), 0);
  const mileageDeduction = totalMiles * 0.70;
  const netProfit = totalIncome - totalExpenses;
  const taxRate = userProfile?.country === 'CA' ? 0.28 : 0.153;
  const estTax = netProfit * 0.9235 * taxRate;
  const name = userProfile?.full_name || currentUser.email;
  const country = userProfile?.country === 'CA' ? 'Canada' : 'USA';

  // Group income by platform
  const byPlatform = {};
  income.forEach(r => {
    const p = r.platform;
    if (!byPlatform[p]) byPlatform[p] = { amount: 0, tips: 0, miles: 0, hours: 0 };
    byPlatform[p].amount += parseFloat(r.amount);
    byPlatform[p].tips += parseFloat(r.tips || 0);
    byPlatform[p].miles += parseFloat(r.miles || 0);
    byPlatform[p].hours += parseFloat(r.hours || 0);
  });

  // Group expenses by category
  const byCategory = {};
  expenses.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + parseFloat(r.amount);
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>GigProfit Tax Report ${year}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 3px solid #00d4aa; }
  .logo { font-size: 22px; font-weight: 800; color: #00d4aa; }
  .report-title { font-size: 14px; color: #666; margin-top: 4px; }
  .meta { text-align: right; font-size: 11px; color: #666; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
  .summary-card { background: #f8f9fa; border-radius: 8px; padding: 14px; border-left: 4px solid #00d4aa; }
  .summary-card.red { border-left-color: #ff4d4d; }
  .summary-card.yellow { border-left-color: #ffa500; }
  .summary-card.blue { border-left-color: #0066ff; }
  .card-label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .card-value { font-size: 18px; font-weight: 800; color: #1a1a1a; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e0e0e0; text-transform: uppercase; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-weight: 700; color: #555; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:last-child td { border-bottom: none; }
  .amount { text-align: right; font-weight: 600; }
  .positive { color: #00a87a; }
  .negative { color: #cc3333; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; font-size: 10px; color: #999; text-align: center; }
  .disclaimer { background: #fff8e6; border: 1px solid #ffd980; border-radius: 6px; padding: 10px 14px; margin-top: 16px; font-size: 10px; color: #7a5c00; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">GigProfit</div>
    <div class="report-title">Tax Summary Report — ${year}</div>
  </div>
  <div class="meta">
    <div><strong>${name}</strong></div>
    <div>${country}</div>
    <div>Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
</div>

<div class="summary-grid">
  <div class="summary-card">
    <div class="card-label">Total Income</div>
    <div class="card-value positive">$${totalIncome.toFixed(2)}</div>
  </div>
  <div class="summary-card red">
    <div class="card-label">Total Expenses</div>
    <div class="card-value negative">$${totalExpenses.toFixed(2)}</div>
  </div>
  <div class="summary-card">
    <div class="card-label">Net Profit</div>
    <div class="card-value">$${netProfit.toFixed(2)}</div>
  </div>
  <div class="summary-card blue">
    <div class="card-label">Total Miles</div>
    <div class="card-value">${totalMiles.toFixed(1)} mi</div>
  </div>
  <div class="summary-card blue">
    <div class="card-label">Mileage Deduction</div>
    <div class="card-value">$${mileageDeduction.toFixed(2)}</div>
  </div>
  <div class="summary-card yellow">
    <div class="card-label">Est. Tax Owed</div>
    <div class="card-value">$${estTax.toFixed(2)}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Income by Platform</div>
  <table>
    <tr><th>Platform</th><th>Earnings</th><th>Tips</th><th>Hours</th><th>Miles</th><th class="amount">Total</th></tr>
    ${Object.entries(byPlatform).map(([p, d]) => `
    <tr>
      <td>${p}</td>
      <td>$${d.amount.toFixed(2)}</td>
      <td>$${d.tips.toFixed(2)}</td>
      <td>${d.hours.toFixed(1)}h</td>
      <td>${d.miles.toFixed(1)}</td>
      <td class="amount positive">$${(d.amount + d.tips).toFixed(2)}</td>
    </tr>`).join('')}
    <tr style="font-weight:700;background:#f8f9fa">
      <td>TOTAL</td><td colspan="4"></td>
      <td class="amount positive">$${totalIncome.toFixed(2)}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Expenses by Category</div>
  <table>
    <tr><th>Category</th><th class="amount">Amount</th></tr>
    ${Object.entries(byCategory).map(([cat, amt]) => `
    <tr><td>${cat}</td><td class="amount negative">$${amt.toFixed(2)}</td></tr>
    `).join('')}
    <tr style="font-weight:700;background:#f8f9fa">
      <td>TOTAL</td>
      <td class="amount negative">$${totalExpenses.toFixed(2)}</td>
    </tr>
  </table>
</div>

<div class="disclaimer">
  ⚠️ <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute tax advice. Tax estimates are approximations. Please consult a qualified tax professional for your specific situation.
</div>

<div class="footer">
  Generated by GigProfit — gigprofitapp.github.io/GigProfit | ${new Date().getFullYear()}
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
  showToast('PDF report opened — use Print to save as PDF', 'success');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── EXPORT MODAL ──────────────────────────────────────────

function showExportModal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Set defaults
  document.getElementById('exportDateFrom').value = `${year}-01-01`;
  document.getElementById('exportDateTo').value = `${year}-${month}-${String(now.getDate()).padStart(2,'0')}`;
  document.getElementById('exportModal').classList.add('active');
}

async function runExport() {
  const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf';
  const dataType = document.querySelector('input[name="exportData"]:checked')?.value || 'all';
  const dateFrom = document.getElementById('exportDateFrom').value;
  const dateTo = document.getElementById('exportDateTo').value;
  const btn = document.getElementById('runExportBtn');

  if (!dateFrom || !dateTo) return showToast('Please select a date range', 'error');
  if (dateFrom > dateTo) return showToast('Start date must be before end date', 'error');

  setLoading(btn, true, 'Preparing...');

  let income = [], expenses = [];

  if (dataType === 'all' || dataType === 'income') {
    const { data } = await db.from('gp_income').select('*')
      .eq('user_id', currentUser.id)
      .gte('date', dateFrom).lte('date', dateTo)
      .order('date', { ascending: false });
    income = data || [];
  }

  if (dataType === 'all' || dataType === 'expenses') {
    const { data } = await db.from('gp_expenses').select('*')
      .eq('user_id', currentUser.id)
      .gte('date', dateFrom).lte('date', dateTo)
      .order('date', { ascending: false });
    expenses = data || [];
  }

  setLoading(btn, false, 'Export');

  if (income.length === 0 && expenses.length === 0) {
    showToast('No data found for selected range', 'error');
    return;
  }

  const label = `${dateFrom} to ${dateTo}`;
  closeModal('exportModal');

  if (format === 'csv') exportCSV(income, expenses, label);
  if (format === 'pdf') exportPDF(income, expenses, label);
}

function setExportRange(range) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let from, to;

  if (range === 'this-month') {
    from = new Date(y, m, 1);
    to = now;
  } else if (range === 'last-month') {
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0);
  } else if (range === 'this-quarter') {
    const q = Math.floor(m / 3);
    from = new Date(y, q * 3, 1);
    to = now;
  } else if (range === 'this-year') {
    from = new Date(y, 0, 1);
    to = now;
  } else if (range === 'last-year') {
    from = new Date(y - 1, 0, 1);
    to = new Date(y - 1, 11, 31);
  } else if (range === 'all-time') {
    from = new Date(2020, 0, 1);
    to = now;
  }

  document.getElementById('exportDateFrom').value = from.toISOString().split('T')[0];
  document.getElementById('exportDateTo').value = to.toISOString().split('T')[0];

  // Highlight selected button
  document.querySelectorAll('.btn-range').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}
