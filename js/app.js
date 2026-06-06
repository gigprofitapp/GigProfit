// ============================
// GIGPROFIT — ALL IN ONE
// ============================

const SUPABASE_URL = 'https://avydceapvbefcaquvazq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWRjZWFwdmJlZmNhcXV2YXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MTU2OTYsImV4cCI6MjA5NjE5MTY5Nn0.VKU-cx37t9Np7DB_1T7kPVeGmkp_CZEEgeo0dqe4BPQ';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================
// STATE
// ============================
let currentUser = null;
let userProfile = null;
let currentPeriod = 'today';
let editingIncomeId = null;
let editingExpenseId = null;
let obData = { platforms: [], country: 'US', currency: 'USD', taxStatus: 'single', monthlyGoal: 3000 };

const PLATFORMS = {
  uber: { label: 'Uber', emoji: '🚗' },
  lyft: { label: 'Lyft', emoji: '🩷' },
  doordash: { label: 'DoorDash', emoji: '🍔' },
  instacart: { label: 'Instacart', emoji: '🛒' },
  amazon_flex: { label: 'Amazon Flex', emoji: '📦' },
  uber_eats: { label: 'Uber Eats', emoji: '🍕' },
  grubhub: { label: 'Grubhub', emoji: '🥡' },
  shipt: { label: 'Shipt', emoji: '🛍' },
  spark: { label: 'Spark', emoji: '⚡' },
  other: { label: 'Other', emoji: '🔧' },
};

const EXPENSES = {
  gas: { label: 'Gas / Fuel', emoji: '⛽' },
  car_payment: { label: 'Car Payment', emoji: '🚗' },
  insurance: { label: 'Insurance', emoji: '🛡' },
  maintenance: { label: 'Maintenance', emoji: '🔧' },
  car_wash: { label: 'Car Wash', emoji: '🚿' },
  phone: { label: 'Phone Plan', emoji: '📱' },
  tolls: { label: 'Tolls', emoji: '🛣' },
  parking: { label: 'Parking', emoji: '🅿️' },
  other: { label: 'Other', emoji: '📦' },
};

// ============================
// UTILS
// ============================
function $(id) { return document.getElementById(id); }
function fmtMoney(n, cur) {
  const sym = cur === 'CAD' ? 'CA$' : '$';
  const v = parseFloat(n) || 0;
  return sym + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
}
function todayISO() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function getCurrency() { return userProfile?.currency || 'USD'; }

function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3000);
}

function showScreen(id) {
  ['splash-screen','auth-screen','onboarding-screen','app-screen'].forEach(s => {
    const el = $(s);
    if (el) el.style.display = s === id ? '' : 'none';
  });
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  const pg = $('page-' + name);
  if (pg) pg.style.display = 'block';
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.querySelector(`.nav-btn[data-page="${name}"]`);
  if (nb) nb.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'income') loadIncomePage();
  if (name === 'expenses') loadExpensePage();
  if (name === 'settings') loadSettings();
  if (name === 'mileage') loadMileagePage();
}

function openModal(id) { $(id).style.display = 'flex'; }
function closeModal(id) { $(id).style.display = 'none'; }

function togglePw(inputId, btn) {
  const el = $(inputId);
  if (el.type === 'password') { el.type = 'text'; btn.textContent = '🙈'; }
  else { el.type = 'password'; btn.textContent = '👁'; }
}

// ============================
// THEME
// ============================
function initTheme() {
  const t = localStorage.getItem('gp_theme') || 'dark';
  applyTheme(t);
}
function applyTheme(t) {
  document.body.className = 'theme-' + t;
  localStorage.setItem('gp_theme', t);
  const tog = $('dark-mode-toggle');
  if (tog) tog.checked = t === 'dark';
}
function toggleTheme() {
  applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark');
}
function toggleThemeFromSwitch(el) { applyTheme(el.checked ? 'dark' : 'light'); }

// ============================
// AUTH TABS
// ============================
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
  $('signin-form').style.display = tab === 'signin' ? 'flex' : 'none';
  $('signup-form').style.display = tab === 'signup' ? 'flex' : 'none';
}

// ============================
// AUTH
// ============================
async function signIn() {
  const email = $('signin-email').value.trim();
  const password = $('signin-password').value;
  const btn = $('signin-btn');
  if (!email || !password) { showAuthError('Please enter email and password.'); return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Sign In';
  if (error) showAuthError(error.message);
}

async function signUp() {
  const name = $('signup-name').value.trim();
  const email = $('signup-email').value.trim();
  const password = $('signup-password').value;
  const btn = $('signup-btn');
  if (!email || !password) { showAuthError('Please fill all fields.', 'signup-error'); return; }
  if (password.length < 6) { showAuthError('Password min 6 characters.', 'signup-error'); return; }
  btn.disabled = true; btn.textContent = 'Creating…';
  const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
  btn.disabled = false; btn.textContent = 'Create Account';
  if (error) { showAuthError(error.message, 'signup-error'); return; }
  showToast('Check your email to confirm your account!');
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) showToast('Google sign-in failed: ' + error.message, 'error');
}

async function showForgotPassword() {
  const email = $('signin-email').value.trim();
  if (!email) { showToast('Enter your email first.', 'error'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) showToast(error.message, 'error');
  else showToast('Password reset email sent!');
}

async function confirmSignOut() {
  if (!confirm('Sign out of GigProfit?')) return;
  await sb.auth.signOut();
}

function showAuthError(msg, elId = 'auth-error') {
  const el = $(elId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

// ============================
// PROFILE
// ============================
async function loadProfile() {
  if (!currentUser) return;
  const { data } = await sb.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data;
}

async function saveProfile(updates) {
  if (!currentUser) return null;
  const { error } = await sb.from('profiles').upsert({ user_id: currentUser.id, ...updates }, { onConflict: 'user_id' });
  if (!error) await loadProfile();
  return error;
}

// ============================
// ONBOARDING
// ============================
function initOnboarding() {
  obData = { platforms: [], country: 'US', currency: 'USD', taxStatus: 'single', monthlyGoal: 3000 };
  showObStep(1);
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.platform;
      btn.classList.toggle('selected');
      if (obData.platforms.includes(p)) obData.platforms = obData.platforms.filter(x => x !== p);
      else obData.platforms.push(p);
    });
  });
}

function showObStep(n) {
  document.querySelectorAll('.ob-step').forEach(s => s.style.display = 'none');
  const step = $('ob-step-' + n);
  if (step) step.style.display = 'flex';
  const pct = ((n - 1) / 4) * 100;
  $('ob-progress').style.width = pct + '%';
  $('ob-step-label').textContent = 'Step ' + n + ' of 4';
}

function obNext(step) {
  if (step === 1) {
    if (obData.platforms.length === 0) { showToast('Select at least one platform', 'error'); return; }
    showObStep(2);
  } else if (step === 2) {
    if (!obData.country) { showToast('Select your country', 'error'); return; }
    showObStep(3);
  } else if (step === 3) {
    if (!obData.taxStatus) { showToast('Select filing status', 'error'); return; }
    showObStep(4);
    $('goal-symbol').textContent = obData.currency === 'CAD' ? 'CA$' : '$';
  }
}

function selectCountry(btn) {
  document.querySelectorAll('[data-country]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  obData.country = btn.dataset.country;
  obData.currency = btn.dataset.currency;
}

function selectOption(btn, type) {
  btn.parentElement.querySelectorAll('.ob-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (type === 'tax') obData.taxStatus = btn.dataset.tax;
}

async function obFinish() {
  obData.monthlyGoal = parseFloat($('monthly-goal').value) || 3000;
  const btn = document.querySelector('#ob-step-4 .ob-next');
  btn.disabled = true; btn.textContent = 'Setting up…';
  const error = await saveProfile({
    platforms: obData.platforms, country: obData.country,
    currency: obData.currency, tax_status: obData.taxStatus,
    monthly_goal: obData.monthlyGoal, onboarding_done: true,
  });
  btn.disabled = false; btn.textContent = 'Start Tracking 🚀';
  if (error) { showToast('Error saving. Try again.', 'error'); return; }
  launchApp();
}

// ============================
// DASHBOARD
// ============================
function getPeriodDates(period) {
  const now = new Date();
  const end = todayISO();
  let start;
  if (period === 'today') start = todayISO();
  else if (period === 'week') { const d = new Date(now); d.setDate(d.getDate()-6); start = d.toISOString().split('T')[0]; }
  else start = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
  return { start, end };
}

function estimateTax(net, country, status) {
  if (net <= 0) return 0;
  if (country === 'CA') return net * 0.28;
  const se = net * 0.9235 * 0.153;
  const taxable = net - se * 0.5;
  let inc = 0;
  if (status === 'married_joint') {
    if (taxable <= 23200) inc = taxable * 0.10;
    else if (taxable <= 94300) inc = 2320 + (taxable-23200)*0.12;
    else inc = 2320 + 8532 + (taxable-94300)*0.22;
  } else {
    if (taxable <= 11600) inc = taxable * 0.10;
    else if (taxable <= 47150) inc = 1160 + (taxable-11600)*0.12;
    else inc = 1160 + 4266 + (taxable-47150)*0.22;
  }
  return se + inc;
}

async function loadDashboard() {
  loadWeeklyChart();
  if (!currentUser) return;
  const cur = getCurrency();
  const { start, end } = getPeriodDates(currentPeriod);
  const [{ data: inc }, { data: exp }] = await Promise.all([
    sb.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
    sb.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
  ]);
  const income = inc || [], expenses = exp || [];
  const gross = income.reduce((s,r) => s + (+r.amount||0) + (+r.tips||0), 0);
  const totalExp = expenses.reduce((s,r) => s + (+r.amount||0), 0);
  const net = gross - totalExp;
  const hours = income.reduce((s,r) => s + (+r.hours||0), 0);
  const pph = hours > 0 ? net / hours : 0;
  const country = userProfile?.country || 'US';
  const taxStatus = userProfile?.tax_status || 'single';
  const monthlyGoal = userProfile?.monthly_goal || 0;
  const divider = currentPeriod === 'today' ? 30 : currentPeriod === 'week' ? 4.33 : 1;
  const tax = estimateTax(Math.max(0, net) * 12, country, taxStatus) / 12 / divider;
  const profit = net - tax;

  $('dash-profit').textContent = fmtMoney(profit, cur);
  $('dash-income').textContent = fmtMoney(gross, cur);
  $('dash-expenses').textContent = fmtMoney(totalExp, cur);
  $('dash-tax').textContent = fmtMoney(tax, cur);
  $('dash-hours').textContent = hours > 0 ? hours.toFixed(1) + 'h worked' : '0h worked';
  $('dash-pph').textContent = fmtMoney(pph, cur) + '/hr';

  // Goal progress
  if (monthlyGoal > 0) {
    const now = new Date();
    const mStart = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
    const { data: mInc } = await sb.from('gp_income').select('amount,tips').eq('user_id', currentUser.id).gte('date', mStart).lte('date', todayISO());
    const mTotal = (mInc||[]).reduce((s,r) => s + (+r.amount||0) + (+r.tips||0), 0);
    const pct = Math.min(100, (mTotal/monthlyGoal)*100);
    $('goal-track-fill').style.width = pct.toFixed(0) + '%';
    $('goal-track-label').textContent = pct.toFixed(0) + '% of ' + fmtMoney(monthlyGoal, cur) + ' monthly goal';
    $('goal-track').style.display = '';
  } else {
    $('goal-track').style.display = 'none';
  }

  // Platform breakdown
  const byPlatform = {};
  income.forEach(r => { const p = r.platform||'other'; byPlatform[p] = (byPlatform[p]||0) + (+r.amount||0) + (+r.tips||0); });
  const pb = $('platform-breakdown');
  if (Object.keys(byPlatform).length === 0) {
    pb.innerHTML = '<div class="empty-state-sm">No income logged yet</div>';
  } else {
    const max = Math.max(...Object.values(byPlatform));
    pb.innerHTML = Object.entries(byPlatform).sort((a,b)=>b[1]-a[1]).map(([p,amt]) => {
      const info = PLATFORMS[p] || { label: p, emoji: '🔧' };
      return `<div class="platform-bar-row">
        <div class="platform-bar-label">${info.emoji} ${info.label}</div>
        <div class="platform-bar-track"><div class="platform-bar-fill" style="width:${(amt/max*100).toFixed(0)}%"></div></div>
        <div class="platform-bar-amount">${fmtMoney(amt,cur)}</div>
      </div>`;
    }).join('');
  }

  // Recent activity
  const all = [
    ...income.map(r => ({...r, type:'income'})),
    ...expenses.map(r => ({...r, type:'expense'})),
  ].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,5);
  const ra = $('recent-activity');
  if (!all.length) { ra.innerHTML = '<div class="empty-state-sm">Log your first trip or delivery</div>'; }
  else ra.innerHTML = all.map(item => {
    if (item.type === 'income') {
      const info = PLATFORMS[item.platform] || { label: item.platform, emoji: '🚗' };
      const total = (+item.amount||0) + (+item.tips||0);
      const meta = [item.hours ? item.hours+'h' : null, item.miles ? item.miles+' mi' : null].filter(Boolean).join(' · ');
      return `<div class="activity-item"><div class="activity-icon">${info.emoji}</div><div class="activity-info"><div class="activity-platform">${info.label}</div><div class="activity-meta">${meta||'Income'} · ${fmtDate(item.date)}</div></div><div class="activity-amount income">${fmtMoney(total,cur)}</div></div>`;
    } else {
      const info = EXPENSES[item.category] || { label: item.category, emoji: '📦' };
      return `<div class="activity-item"><div class="activity-icon">${info.emoji}</div><div class="activity-info"><div class="activity-platform">${info.label}</div><div class="activity-meta">${item.notes||'Expense'} · ${fmtDate(item.date)}</div></div><div class="activity-amount expense">-${fmtMoney(item.amount,cur)}</div></div>`;
    }
  }).join('');
}

function setPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  $('platform-period-label').textContent = period.charAt(0).toUpperCase() + period.slice(1);
  loadDashboard();
}

// ============================
// INCOME
// ============================
function populatePlatformDropdown() {
  const sel = $('income-platform');
  if (!sel) return;
  const platforms = userProfile?.platforms || [];
  sel.innerHTML = '<option value="">Select platform…</option>';
  platforms.forEach(p => {
    const info = PLATFORMS[p] || { label: p, emoji: '🔧' };
    sel.innerHTML += `<option value="${p}">${info.emoji} ${info.label}</option>`;
  });
  if (!platforms.includes('other')) sel.innerHTML += `<option value="other">🔧 Other</option>`;
}

function openAddIncome() {
  editingIncomeId = null;
  $('income-modal-title').textContent = 'Log Income';
  $('income-platform').value = '';
  $('income-amount').value = '';
  $('income-tips').value = '';
  $('income-hours').value = '';
  $('income-miles').value = '';
  $('income-date').value = todayISO();
  $('income-notes').value = '';
  populatePlatformDropdown();
  openModal('add-income-modal');
}

async function saveIncome() {
  const platform = $('income-platform').value;
  const amount = parseFloat($('income-amount').value) || 0;
  const tips = parseFloat($('income-tips').value) || 0;
  const hours = parseFloat($('income-hours').value) || null;
  const miles = parseFloat($('income-miles').value) || null;
  const date = $('income-date').value || todayISO();
  const notes = $('income-notes').value.trim() || null;
  if (!platform) { showToast('Select a platform', 'error'); return; }
  if (amount <= 0 && tips <= 0) { showToast('Enter an amount', 'error'); return; }
  const record = { user_id: currentUser.id, platform, amount, tips, hours, miles, date, notes };
  const { error } = editingIncomeId
    ? await sb.from('gp_income').update(record).eq('id', editingIncomeId)
    : await sb.from('gp_income').insert(record);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal('add-income-modal');
  showToast(editingIncomeId ? 'Income updated!' : 'Income logged! 💰');
  editingIncomeId = null;
  loadIncomePage();
  loadDashboard();
}

async function loadIncomePage() {
  if (!currentUser) return;
  const cur = getCurrency();
  const now = new Date();
  const mStart = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
  const { data: mData } = await sb.from('gp_income').select('amount,tips,miles').eq('user_id', currentUser.id).gte('date', mStart).lte('date', todayISO());
  const mIncome = (mData||[]).reduce((s,r) => s + (+r.amount||0) + (+r.tips||0), 0);
  const mMiles = (mData||[]).reduce((s,r) => s + (+r.miles||0), 0);
  const mTips = (mData||[]).reduce((s,r) => s + (+r.tips||0), 0);
  $('income-month-total').textContent = fmtMoney(mIncome, cur);
  $('income-month-miles').textContent = mMiles.toFixed(0) + ' mi';
  $('income-month-tips').textContent = fmtMoney(mTips, cur);
  const { data: all } = await sb.from('gp_income').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }).limit(50);
  renderIncomeList(all||[], cur);
  populatePlatformDropdown();
}

function renderIncomeList(records, cur) {
  const container = $('income-list');
  if (!records.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><h3>No income logged</h3><p>Tap "+ Add" to log your first earnings</p></div>`;
    return;
  }
  const byDate = {};
  records.forEach(r => { const d = r.date||todayISO(); if (!byDate[d]) byDate[d]=[]; byDate[d].push(r); });
  container.innerHTML = Object.entries(byDate).map(([date, items]) => {
    const dayTotal = items.reduce((s,r) => s + (+r.amount||0) + (+r.tips||0), 0);
    return `<div class="date-group-header"><span>${fmtDate(date)}</span><span style="color:var(--income-color)">${fmtMoney(dayTotal,cur)}</span></div>
    ${items.map(r => {
      const info = PLATFORMS[r.platform] || { label: r.platform, emoji: '🚗' };
      const total = (+r.amount||0) + (+r.tips||0);
      const meta = [r.hours ? r.hours+'h' : null, r.miles ? r.miles+' mi' : null, r.tips > 0 ? '+'+fmtMoney(r.tips,cur)+' tips' : null, r.notes].filter(Boolean).join(' · ');
      return `<div class="entry-card" onclick="editIncome('${r.id}')">
        <div class="entry-card-icon">${info.emoji}</div>
        <div class="entry-card-info"><div class="entry-card-title">${info.label}</div><div class="entry-card-meta">${meta||'Income'}</div></div>
        <div class="entry-card-right"><div class="entry-card-amount income">${fmtMoney(total,cur)}</div><div class="entry-card-date">${fmtDate(r.date)}</div></div>
      </div>`;
    }).join('')}`;
  }).join('');
}

async function editIncome(id) {
  const { data } = await sb.from('gp_income').select('*').eq('id', id).single();
  if (!data) return;
  editingIncomeId = id;
  $('income-modal-title').textContent = 'Edit Income';
  populatePlatformDropdown();
  $('income-platform').value = data.platform||'';
  $('income-amount').value = data.amount||'';
  $('income-tips').value = data.tips||'';
  $('income-hours').value = data.hours||'';
  $('income-miles').value = data.miles||'';
  $('income-date').value = data.date||todayISO();
  $('income-notes').value = data.notes||'';
  openModal('add-income-modal');
}

// ============================
// EXPENSES
// ============================
function openAddExpense() {
  editingExpenseId = null;
  $('expense-modal-title').textContent = 'Log Expense';
  $('expense-category').value = 'gas';
  $('expense-amount').value = '';
  $('expense-date').value = todayISO();
  $('expense-notes').value = '';
  $('expense-deductible-check').checked = true;
  openModal('add-expense-modal');
}

async function saveExpense() {
  const category = $('expense-category').value;
  const amount = parseFloat($('expense-amount').value) || 0;
  const date = $('expense-date').value || todayISO();
  const notes = $('expense-notes').value.trim() || null;
  const is_deductible = $('expense-deductible-check').checked;
  if (amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  const record = { user_id: currentUser.id, category, amount, date, notes, is_deductible };
  const { error } = editingExpenseId
    ? await sb.from('gp_expenses').update(record).eq('id', editingExpenseId)
    : await sb.from('gp_expenses').insert(record);
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  closeModal('add-expense-modal');
  showToast(editingExpenseId ? 'Expense updated!' : 'Expense logged! 🧾');
  editingExpenseId = null;
  loadExpensePage();
  loadDashboard();
}

async function loadExpensePage() {
  if (!currentUser) return;
  const cur = getCurrency();
  const now = new Date();
  const mStart = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
  const { data: mData } = await sb.from('gp_expenses').select('amount,category,is_deductible').eq('user_id', currentUser.id).gte('date', mStart).lte('date', todayISO());
  const mTotal = (mData||[]).reduce((s,r) => s + (+r.amount||0), 0);
  const mGas = (mData||[]).filter(r=>r.category==='gas').reduce((s,r) => s + (+r.amount||0), 0);
  const mDed = (mData||[]).filter(r=>r.is_deductible).reduce((s,r) => s + (+r.amount||0), 0);
  $('expense-month-total').textContent = fmtMoney(mTotal, cur);
  $('expense-month-gas').textContent = fmtMoney(mGas, cur);
  $('expense-deductible').textContent = fmtMoney(mDed, cur);
  const { data: all } = await sb.from('gp_expenses').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }).limit(50);
  renderExpenseList(all||[], cur);
}

function renderExpenseList(records, cur) {
  const container = $('expense-list');
  if (!records.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><h3>No expenses logged</h3><p>Track gas, repairs, insurance & more</p></div>`;
    return;
  }
  const byDate = {};
  records.forEach(r => { const d = r.date||todayISO(); if (!byDate[d]) byDate[d]=[]; byDate[d].push(r); });
  container.innerHTML = Object.entries(byDate).map(([date, items]) => {
    const dayTotal = items.reduce((s,r) => s + (+r.amount||0), 0);
    return `<div class="date-group-header"><span>${fmtDate(date)}</span><span style="color:var(--expense-color)">-${fmtMoney(dayTotal,cur)}</span></div>
    ${items.map(r => {
      const info = EXPENSES[r.category] || { label: r.category, emoji: '📦' };
      const badge = r.is_deductible ? '<span class="deduct-badge">deductible</span>' : '';
      return `<div class="entry-card" onclick="editExpense('${r.id}')">
        <div class="entry-card-icon">${info.emoji}</div>
        <div class="entry-card-info"><div class="entry-card-title">${info.label} ${badge}</div><div class="entry-card-meta">${r.notes||'Expense'}</div></div>
        <div class="entry-card-right"><div class="entry-card-amount expense">-${fmtMoney(r.amount,cur)}</div><div class="entry-card-date">${fmtDate(r.date)}</div></div>
      </div>`;
    }).join('')}`;
  }).join('');
}

async function editExpense(id) {
  const { data } = await sb.from('gp_expenses').select('*').eq('id', id).single();
  if (!data) return;
  editingExpenseId = id;
  $('expense-modal-title').textContent = 'Edit Expense';
  $('expense-category').value = data.category||'gas';
  $('expense-amount').value = data.amount||'';
  $('expense-date').value = data.date||todayISO();
  $('expense-notes').value = data.notes||'';
  $('expense-deductible-check').checked = data.is_deductible !== false;
  openModal('add-expense-modal');
}

// ============================
// SETTINGS
// ============================
function loadSettings() {
  if (!currentUser) return;
  const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Driver';
  const initial = name[0].toUpperCase();
  $('settings-avatar').textContent = initial;
  $('settings-name').textContent = name;
  $('settings-email').textContent = currentUser.email || '';
  const goal = userProfile?.monthly_goal || 0;
  const cur = getCurrency();
  $('settings-goal-display').textContent = fmtMoney(goal, cur);
  $('settings-platforms-display').textContent = (userProfile?.platforms||[]).map(p => PLATFORMS[p]?.label||p).join(', ') || 'None set';
  $('dark-mode-toggle').checked = document.body.classList.contains('theme-dark');
}

function openGoalEdit() {
  const goal = userProfile?.monthly_goal || 0;
  const val = prompt('Set monthly income goal ($):', goal);
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) { showToast('Invalid amount', 'error'); return; }
  saveProfile({ monthly_goal: num }).then(() => { loadSettings(); showToast('Goal updated!'); });
}

function openPlatformEdit() { showToast('Re-run onboarding to edit platforms (coming soon)'); }

// ============================
// APP LAUNCH
// ============================
function updateHeaderUser() {
  if (!currentUser) return;
  const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Driver';
  $('greeting-text').textContent = greeting();
  $('header-user-name').textContent = name.split(' ')[0];
  $('user-avatar').textContent = name[0].toUpperCase();
}

function routeAfterAuth() {
  if (!userProfile || !userProfile.onboarding_done) {
    showScreen('onboarding-screen');
    initOnboarding();
  } else {
    launchApp();
  }
}

function launchApp() {
  showScreen('app-screen');
  updateHeaderUser();
  showPage('dashboard');
}

// ============================
// INIT
// ============================
async function initApp() {
  initTheme();
  setTimeout(() => { const s = $('splash-screen'); if (s) s.style.display = 'none'; }, 2000);
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      await loadProfile();
      routeAfterAuth();
    } else {
      showScreen('auth-screen');
    }
  } catch(e) {
    console.error(e);
    showScreen('auth-screen');
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await loadProfile();
      routeAfterAuth();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; userProfile = null;
      showScreen('auth-screen');
    }
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
  }
}

window.addEventListener('DOMContentLoaded', initApp);

// ============================
// PHASE 2 — EARNINGS CHART
// ============================

async function loadWeeklyChart() {
  const canvas = document.getElementById('earnings-chart');
  if (!canvas || !currentUser) return;
  const ctx = canvas.getContext('2d');
  const cur = getCurrency();

  // Get last 7 days
  const days = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  const { data: inc } = await sb.from('gp_income')
    .select('date,amount,tips')
    .eq('user_id', currentUser.id)
    .gte('date', days[0])
    .lte('date', days[6]);

  const { data: exp } = await sb.from('gp_expenses')
    .select('date,amount')
    .eq('user_id', currentUser.id)
    .gte('date', days[0])
    .lte('date', days[6]);

  const incByDay = {};
  const expByDay = {};
  days.forEach(d => { incByDay[d] = 0; expByDay[d] = 0; });
  (inc||[]).forEach(r => { incByDay[r.date] = (incByDay[r.date]||0) + (+r.amount||0) + (+r.tips||0); });
  (exp||[]).forEach(r => { expByDay[r.date] = (expByDay[r.date]||0) + (+r.amount||0); });

  const incData = days.map(d => incByDay[d]);
  const expData = days.map(d => expByDay[d]);
  const profitData = days.map(d => Math.max(0, incByDay[d] - expByDay[d]));
  const maxVal = Math.max(...incData, 1);

  // Clear canvas
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const padL = 8, padR = 8, padT = 28, padB = 40;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const gap = chartW / 7;
  const barW = gap * 0.45;

  // Draw bars
  days.forEach((d, i) => {
    const x = padL + i * gap + gap * 0.25;
    const incH = (incData[i] / maxVal) * chartH;
    const expH = (expData[i] / maxVal) * chartH;
    const isToday = d === todayISO();

    // Income bar (green)
    const incGrad = ctx.createLinearGradient(0, padT + chartH - incH, 0, padT + chartH);
    incGrad.addColorStop(0, '#00d4aa');
    incGrad.addColorStop(1, 'rgba(0,212,170,0.3)');
    ctx.fillStyle = incGrad;
    ctx.beginPath();
    ctx.roundRect(x, padT + chartH - incH, barW, incH, [4, 4, 0, 0]);
    ctx.fill();

    // Expense bar (red, smaller behind)
    if (expData[i] > 0) {
      const expH2 = (expData[i] / maxVal) * chartH;
      ctx.fillStyle = 'rgba(255,107,107,0.7)';
      ctx.beginPath();
      ctx.roundRect(x + barW * 0.6, padT + chartH - expH2, barW * 0.4, expH2, [3, 3, 0, 0]);
      ctx.fill();
    }

    // Amount label above bar
    if (incData[i] > 0) {
      ctx.fillStyle = '#00d4aa';
      ctx.font = `bold 10px DM Sans, sans-serif`;
      ctx.textAlign = 'center';
      const sym = cur === 'CAD' ? 'C$' : '$';
      ctx.fillText(sym + incData[i].toFixed(0), x + barW/2, padT + chartH - incH - 4);
    }

    // Day label
    ctx.fillStyle = isToday ? '#00d4aa' : 'rgba(255,255,255,0.5)';
    ctx.font = `${isToday ? 'bold ' : ''}11px DM Sans, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW/2, h - 8);

    // Today indicator dot
    if (isToday) {
      ctx.fillStyle = '#00d4aa';
      ctx.beginPath();
      ctx.arc(x + barW/2, h - 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Weekly total
  const weekTotal = incData.reduce((a,b) => a+b, 0);
  const weekExp = expData.reduce((a,b) => a+b, 0);
  const el = document.getElementById('chart-week-total');
  if (el) {
    const sym = cur === 'CAD' ? 'CA$' : '$';
    el.textContent = sym + weekTotal.toFixed(0) + ' earned · ' + sym + weekExp.toFixed(0) + ' spent';
  }
}

// ============================
// PHASE 2 — MILEAGE TRACKER
// ============================

const IRS_RATE_2024 = 0.67; // per mile
const CRA_RATE_2024 = 0.70; // CAD per km

async function loadMileagePage() {
  if (!currentUser) return;
  const cur = getCurrency();
  const isCAD = cur === 'CAD';
  const rate = isCAD ? CRA_RATE_2024 : IRS_RATE_2024;
  const unit = isCAD ? 'km' : 'mi';

  // This month
  const now = new Date();
  const mStart = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';

  const { data: mInc } = await sb.from('gp_income')
    .select('miles,date')
    .eq('user_id', currentUser.id)
    .gte('date', mStart)
    .lte('date', todayISO());

  const totalMiles = (mInc||[]).reduce((s,r) => s + (+r.miles||0), 0);
  const deduction = totalMiles * rate;

  // Update mileage page
  const container = document.getElementById('mileage-content');
  if (!container) return;

  // Year total
  const yStart = now.getFullYear() + '-01-01';
  const { data: yInc } = await sb.from('gp_income')
    .select('miles')
    .eq('user_id', currentUser.id)
    .gte('date', yStart)
    .lte('date', todayISO());
  const yearMiles = (yInc||[]).reduce((s,r) => s + (+r.miles||0), 0);
  const yearDeduction = yearMiles * rate;
  const sym = isCAD ? 'CA$' : '$';

  container.innerHTML = `
    <div class="mileage-hero">
      <div class="mileage-stat">
        <div class="mileage-number">${totalMiles.toFixed(0)}</div>
        <div class="mileage-label">${unit} this month</div>
      </div>
      <div class="mileage-divider"></div>
      <div class="mileage-stat">
        <div class="mileage-number" style="color:var(--income-color)">${sym}${deduction.toFixed(0)}</div>
        <div class="mileage-label">est. tax deduction</div>
      </div>
    </div>

    <div class="section-card" style="margin-bottom:14px">
      <div class="section-header"><h3>IRS Rate ${now.getFullYear()}</h3></div>
      <div class="mileage-rate-row">
        <div class="mileage-rate-info">
          <div class="mileage-rate-value">${isCAD ? 'CA$0.70' : '$0.67'}<span>/mile</span></div>
          <div class="mileage-rate-note">Standard ${isCAD ? 'CRA' : 'IRS'} mileage deduction rate</div>
        </div>
        <div class="mileage-rate-badge">${now.getFullYear()}</div>
      </div>
    </div>

    <div class="section-card" style="margin-bottom:14px">
      <div class="section-header"><h3>Year to Date</h3></div>
      <div class="mileage-ytd-row">
        <div class="mileage-ytd-item">
          <div class="mileage-ytd-val">${yearMiles.toFixed(0)} ${unit}</div>
          <div class="mileage-ytd-label">Total miles driven</div>
        </div>
        <div class="mileage-ytd-item">
          <div class="mileage-ytd-val" style="color:var(--income-color)">${sym}${yearDeduction.toFixed(2)}</div>
          <div class="mileage-ytd-label">Est. deduction</div>
        </div>
      </div>
      <div class="mileage-tip">
        💡 Log miles on each income entry to track your deduction automatically
      </div>
    </div>

    <div class="section-card">
      <div class="section-header"><h3>Recent Trips</h3></div>
      <div id="recent-miles-list">
        ${await getRecentMilesList(unit, sym)}
      </div>
    </div>
  `;
}

async function getRecentMilesList(unit, sym) {
  const { data } = await sb.from('gp_income')
    .select('date,platform,miles,amount,tips')
    .eq('user_id', currentUser.id)
    .not('miles', 'is', null)
    .gt('miles', 0)
    .order('date', { ascending: false })
    .limit(10);

  if (!data || !data.length) return '<div class="empty-state-sm">No mileage logged yet — add miles when logging income</div>';

  const rate = (userProfile?.currency === 'CAD') ? CRA_RATE_2024 : IRS_RATE_2024;
  return data.map(r => {
    const info = PLATFORMS[r.platform] || { label: r.platform, emoji: '🚗' };
    const ded = (+r.miles * rate).toFixed(2);
    return `<div class="activity-item">
      <div class="activity-icon">${info.emoji}</div>
      <div class="activity-info">
        <div class="activity-platform">${info.label}</div>
        <div class="activity-meta">${fmtDate(r.date)} · ${sym}${ded} est. deduction</div>
      </div>
      <div class="activity-amount income">${r.miles} ${unit}</div>
    </div>`;
  }).join('');
}
