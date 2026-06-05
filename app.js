// ============================
// GIGPROFIT — APP CORE
// ============================

const SUPABASE_URL = 'https://avydceapvbefcaquvazq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWRjZWFwdmJlZmNhcXV2YXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MTU2OTYsImV4cCI6MjA5NjE5MTY5Nn0.VKU-cx37t9Np7DB_1T7kPVeGmkp_CZEEgeo0dqe4BPQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- App State ----
let currentUser = null;
let userProfile = null;
let currentPeriod = 'today';
let editingIncomeId = null;
let editingExpenseId = null;

const PLATFORM_LABELS = {
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

const EXPENSE_LABELS = {
  gas: { label: 'Gas / Fuel', emoji: '⛽' },
  car_payment: { label: 'Car Payment', emoji: '🚗' },
  insurance: { label: 'Insurance', emoji: '🛡' },
  maintenance: { label: 'Maintenance', emoji: '🔧' },
  car_wash: { label: 'Car Wash', emoji: '🚿' },
  phone: { label: 'Phone Plan', emoji: '📱' },
  data: { label: 'Data / Hotspot', emoji: '📡' },
  tolls: { label: 'Tolls', emoji: '🛣' },
  parking: { label: 'Parking', emoji: '🅿️' },
  supplies: { label: 'Supplies', emoji: '🧹' },
  other: { label: 'Other', emoji: '📦' },
};

// ---- Tax estimation (US self-employment) ----
function estimateTax(income, country = 'US', filingStatus = 'single') {
  if (income <= 0) return 0;
  if (country === 'CA') {
    // Canada: approximate ~15% federal + 8% provincial + CPP ~5%
    return income * 0.28;
  }
  // US: SE tax 15.3% on 92.35% of net + estimated income tax
  const seNet = income * 0.9235;
  const seTax = seNet * 0.153;
  const deductibleSE = seTax * 0.5;
  const taxableIncome = income - deductibleSE;
  // Simplified income tax brackets (2024 single)
  let incomeTax = 0;
  if (filingStatus === 'married_joint') {
    if (taxableIncome <= 23200) incomeTax = taxableIncome * 0.10;
    else if (taxableIncome <= 94300) incomeTax = 2320 + (taxableIncome - 23200) * 0.12;
    else incomeTax = 2320 + 8532 + (taxableIncome - 94300) * 0.22;
  } else {
    if (taxableIncome <= 11600) incomeTax = taxableIncome * 0.10;
    else if (taxableIncome <= 47150) incomeTax = 1160 + (taxableIncome - 11600) * 0.12;
    else incomeTax = 1160 + 4266 + (taxableIncome - 47150) * 0.22;
  }
  return seTax + incomeTax;
}

// ---- Formatting ----
function fmtCurrency(amount, currency = 'USD') {
  const sym = currency === 'CAD' ? 'CA$' : '$';
  const n = parseFloat(amount) || 0;
  return `${sym}${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ---- Toast ----
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

// ---- Screens ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

// ---- Theme ----
function initTheme() {
  const saved = localStorage.getItem('gp_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('gp_theme', theme);
  document.getElementById('theme-color-meta').content = theme === 'dark' ? '#0a0f1e' : '#f0f4f8';
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) toggle.checked = theme === 'dark';
  // Update theme icon
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.innerHTML = theme === 'dark'
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function toggleTheme() {
  const isDark = document.body.classList.contains('theme-dark');
  applyTheme(isDark ? 'light' : 'dark');
}

function toggleThemeFromSwitch(el) {
  applyTheme(el.checked ? 'dark' : 'light');
}

// ---- Navigation ----
function showPage(name, navBtn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (navBtn) {
    navBtn.classList.add('active');
  } else {
    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.page === name) b.classList.add('active');
    });
  }

  // Refresh page data
  if (name === 'dashboard') refreshDashboard();
  if (name === 'income') refreshIncomePage();
  if (name === 'expenses') refreshExpensePage();
  if (name === 'settings') refreshSettings();
}

function setPeriod(period, btn) {
  currentPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('platform-period-label').textContent = period.charAt(0).toUpperCase() + period.slice(1);
  refreshDashboard();
}

// ---- Auth Tab Toggle ----
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('signin-form').classList.add('hidden');
    document.getElementById('signup-form').classList.add('hidden');
    document.getElementById(`${tab.dataset.tab}-form`).classList.remove('hidden');
  });
});

// ---- Auth Functions ----
async function signIn() {
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const btn = document.getElementById('signin-btn');
  const errEl = document.getElementById('auth-error');

  if (!email || !password) { showAuthError('Please enter email and password.', errEl); return; }

  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Sign In';

  if (error) showAuthError(error.message, errEl);
}

async function signUp() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const btn = document.getElementById('signup-btn');
  const errEl = document.getElementById('signup-error');

  if (!email || !password) { showAuthError('Please fill in all fields.', errEl); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters.', errEl); return; }

  btn.disabled = true; btn.textContent = 'Creating account…';
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  btn.disabled = false; btn.textContent = 'Create Account';

  if (error) { showAuthError(error.message, errEl); return; }
  showToast('Check your email to confirm your account!');
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) showToast('Google sign-in failed: ' + error.message, 'error');
}

async function showForgotPassword() {
  const email = document.getElementById('signin-email').value.trim();
  if (!email) { showToast('Enter your email first.', 'error'); return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) showToast(error.message, 'error');
  else showToast('Password reset email sent!');
}

async function confirmSignOut() {
  if (!confirm('Sign out of GigProfit?')) return;
  await supabase.auth.signOut();
}

function showAuthError(msg, el) {
  if (!el) el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ---- Profile ----
async function loadProfile() {
  if (!currentUser) return;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();
  userProfile = data;
}

async function saveProfile(updates) {
  if (!currentUser) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: currentUser.id, ...updates }, { onConflict: 'user_id' });
  if (!error) {
    await loadProfile();
  }
  return error;
}

// ---- Modals ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ---- Password toggle ----
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}

// ---- Settings helpers ----
function refreshSettings() {
  if (!currentUser) return;
  const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Driver';
  const initial = name[0].toUpperCase();
  document.getElementById('settings-avatar').textContent = initial;
  document.getElementById('settings-name').textContent = name;
  document.getElementById('settings-email').textContent = currentUser.email || '';

  const goal = userProfile?.monthly_goal || 0;
  const currency = userProfile?.currency || 'USD';
  document.getElementById('settings-goal-display').textContent = fmtCurrency(goal, currency);
  document.getElementById('settings-platforms-display').textContent =
    (userProfile?.platforms || []).map(p => PLATFORM_LABELS[p]?.label || p).join(', ') || 'None set';

  const isDark = document.body.classList.contains('theme-dark');
  document.getElementById('dark-mode-toggle').checked = isDark;
}

function openGoalEdit() {
  const goal = userProfile?.monthly_goal || 0;
  const val = prompt('Set monthly income goal ($):', goal);
  if (val === null) return;
  const num = parseFloat(val);
  if (isNaN(num) || num < 0) { showToast('Invalid amount', 'error'); return; }
  saveProfile({ monthly_goal: num }).then(() => {
    refreshSettings();
    showToast('Goal updated!');
  });
}

function openPlatformEdit() {
  showToast('Edit platforms in Onboarding (coming soon)', 'success');
}

// ---- Currency label sync ----
function syncCurrencyLabels() {
  const sym = (userProfile?.currency === 'CAD') ? 'CA$' : '$';
  document.querySelectorAll('.currency-label').forEach(el => el.textContent = sym);
  const goalSym = document.getElementById('goal-symbol');
  if (goalSym) goalSym.textContent = sym;
}

// ---- Init ----
async function initApp() {
  initTheme();

  // Hide splash after min 2s
  setTimeout(() => {
    document.getElementById('splash-screen').style.display = 'none';
  }, 2000);

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    currentUser = session.user;
    await loadProfile();
    routeAfterAuth();
  } else {
    showScreen('auth-screen');
  }

  // Auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      await loadProfile();
      routeAfterAuth();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      userProfile = null;
      showScreen('auth-screen');
    }
  });

  // SW registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW:', err));
  }
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
  syncCurrencyLabels();
  updateHeaderUser();
  showPage('dashboard');

  // Check URL shortcut actions
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'income') { showPage('income'); openAddIncome(); }
  if (params.get('action') === 'expense') { showPage('expenses'); openAddExpense(); }
}

function updateHeaderUser() {
  if (!currentUser) return;
  const name = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Driver';
  document.getElementById('greeting-text').textContent = getGreeting();
  document.getElementById('header-user-name').textContent = name.split(' ')[0];
  document.getElementById('user-avatar').textContent = name[0].toUpperCase();
}

// Start
window.addEventListener('DOMContentLoaded', initApp);
