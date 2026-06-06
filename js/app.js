// ── GIGPROFIT v4 ──────────────────────────────
const SUPABASE_URL = 'https://avydceapvbefcaquvazq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWRjZWFwdmJlZmNhcXV2YXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MTU2OTYsImV4cCI6MjA5NjE5MTY5Nn0.VKU-cx37t9Np7DB_1T7kPVeGmkp_CZEEgeo0dqe4BPQ';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null, userProfile = null, editingId = null;
let homePeriod = 'today', earnFilter = 'week', expFilter = 'week';
let obData = { platforms: [], country: 'US', currency: 'USD', tax_status: 'single', monthly_goal: 3000 };

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme(localStorage.getItem('gp-theme') || 'dark');
  initReportMonths();
  const { data: { session } } = await db.auth.getSession();
  if (session) { currentUser = session.user; await loadProfile(); }
  else showPage('auth');
  db.auth.onAuthStateChange(async (e, s) => {
    if (e === 'SIGNED_IN' && s) { currentUser = s.user; await loadProfile(); }
    else if (e === 'SIGNED_OUT') { currentUser = null; userProfile = null; showPage('auth'); }
  });
});

// ── THEME ─────────────────────────────────────
function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t); localStorage.setItem('gp-theme', t);
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '🌙' : '☀️';
  const si = document.getElementById('siTheme');
  if (si) si.textContent = (t === 'dark' ? 'Dark' : 'Light') + ' ›';
}

// ── AUTH ──────────────────────────────────────
function switchAuthTab(tab, el) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tab + 'Form').classList.add('active');
}

async function signIn() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return toast('Please fill all fields', 'error');
  const btn = document.getElementById('signInBtn');
  setLoading(btn, true, 'Signing in...');
  const { error } = await db.auth.signInWithPassword({ email, password });
  setLoading(btn, false, 'Sign In');
  if (error) toast(error.message, 'error');
}

async function signUp() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPassword').value;
  if (!name || !email || !pw) return toast('Please fill all fields', 'error');
  if (pw.length < 6) return toast('Password must be 6+ characters', 'error');
  const btn = document.getElementById('signUpBtn');
  setLoading(btn, true, 'Creating...');
  const { error } = await db.auth.signUp({ email, password: pw, options: { data: { full_name: name } } });
  setLoading(btn, false, 'Create Account');
  if (error) toast(error.message, 'error');
  else toast('Account created! Check your email.', 'success');
}

async function signInWithGoogle() {
  const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://gigprofitapp.github.io/GigProfit/' } });
  if (error) toast(error.message, 'error');
}

async function signOut() {
  await db.auth.signOut();
}

// ── PROFILE LOAD ──────────────────────────────
async function loadProfile() {
  const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data;
  if (!userProfile || !userProfile.onboarding_done) startOnboarding();
  else showPage('home');
}

// ── ONBOARDING ────────────────────────────────
function startOnboarding() {
  obData = { platforms: [], country: 'US', currency: 'USD', tax_status: 'single', monthly_goal: 3000 };
  showStandalonePage('onboardingPage');
  showObStep(1);
}
function showObStep(n) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  document.getElementById('ob' + n)?.classList.add('active');
  document.querySelectorAll('.ob-dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === n);
    d.classList.toggle('done', i + 1 < n);
  });
}
function togglePlatform(el, p) {
  el.classList.toggle('selected');
  if (el.classList.contains('selected')) { if (!obData.platforms.includes(p)) obData.platforms.push(p); }
  else obData.platforms = obData.platforms.filter(x => x !== p);
}
function obNext(step) {
  if (step === 2 && obData.platforms.length === 0) return toast('Select at least one platform', 'error');
  if (step === 3) { obData.country = document.getElementById('obCountry').value; obData.currency = document.getElementById('obCurrency').value; }
  if (step === 4) { obData.tax_status = document.getElementById('obTaxStatus').value; }
  showObStep(step);
}
function obPrev(step) { showObStep(step); }

async function finishOnboarding() {
  const goal = parseFloat(document.getElementById('obGoal').value) || 3000;
  obData.monthly_goal = goal;
  const btn = document.getElementById('obFinishBtn');
  setLoading(btn, true, 'Setting up...');
  const pd = { user_id: currentUser.id, full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0], country: obData.country, currency: obData.currency, tax_status: obData.tax_status, platforms: obData.platforms, monthly_goal: obData.monthly_goal, onboarding_done: true };
  const { error } = await db.from('profiles').upsert(pd, { onConflict: 'user_id' });
  setLoading(btn, false, 'Get Started 🚀');
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  const { data } = await db.from('profiles').select('*').eq('user_id', currentUser.id).single();
  userProfile = data;
  showPage('home');
}

// ── NAVIGATION ────────────────────────────────
function showStandalonePage(id) {
  document.getElementById('appShell').classList.remove('visible');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function showPage(page) {
  const standalone = ['auth', 'onboarding'];
  if (standalone.includes(page)) { showStandalonePage(page + 'Page'); return; }
  const shell = document.getElementById('appShell');
  shell.classList.add('visible');
  document.querySelectorAll('.app-shell > .page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page')?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const loaders = { home: loadHome, earnings: loadEarnings, expenses: loadExpenses, reports: loadReports, profile: loadProfilePage };
  loaders[page]?.();
}

// ── HOME ──────────────────────────────────────
function setHomePeriod(p, btn) {
  homePeriod = p;
  document.querySelectorAll('.period-pill button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadHome();
}

async function loadHome() {
  if (!currentUser) return;
  const name = (userProfile?.full_name || currentUser.email.split('@')[0]).split(' ')[0];
  const h = new Date().getHours();
  document.getElementById('homeGreeting').textContent = (h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,');
  document.getElementById('homeName').textContent = name + ' 👋';

  const { start, end } = getRange(homePeriod);
  const today = new Date().toISOString().split('T')[0];
  const weekStart = getRange('week').start;

  const [{ data: inc }, { data: exp }, { data: weekInc }, { data: weekExp }, { data: todayInc }, { data: todayExp }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', weekStart).lte('date', today),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', weekStart).lte('date', today),
    db.from('gp_income').select('*').eq('user_id', currentUser.id).eq('date', today),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).eq('date', today)
  ]);

  const gross = sum(inc, 'amount') + sum(inc, 'tips');
  const expenses = sum(exp, 'amount');
  const taxRate = userProfile?.country === 'CA' ? 0.28 : 0.153;
  const tax = Math.max(0, gross - expenses) * 0.9235 * taxRate;
  const profit = gross - expenses - tax;

  set('heroProfit', fmt(profit));
  set('heroEarnings', fmt(gross));
  set('heroExpenses', fmt(expenses));
  set('heroTax', fmt(tax));

  const goal = userProfile?.monthly_goal || 0;
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const { data: monthInc } = await db.from('gp_income').select('amount,tips').eq('user_id', currentUser.id).gte('date', monthStart);
  const { data: monthExp } = await db.from('gp_expenses').select('amount').eq('user_id', currentUser.id).gte('date', monthStart);
  const monthGross = sum(monthInc, 'amount') + sum(monthInc, 'tips');
  const monthExpenses = sum(monthExp, 'amount');
  const monthTax = Math.max(0, monthGross - monthExpenses) * 0.9235 * taxRate;
  const monthProfit = monthGross - monthExpenses - monthTax;
  const pct = goal > 0 ? Math.min(100, (monthProfit / goal) * 100) : 0;
  set('goalPct', Math.round(pct) + '% of ' + fmt(goal));
  document.getElementById('goalFill').style.width = pct + '%';
  const remaining = Math.max(0, goal - monthProfit);
  set('homeGoalHint', goal > 0 ? `You're ${fmt(remaining)} away from your monthly goal` : '');

  // Week stats
  const wGross = sum(weekInc, 'amount') + sum(weekInc, 'tips');
  const wExp = sum(weekExp, 'amount');
  const wTax = Math.max(0, wGross - wExp) * 0.9235 * taxRate;
  set('weekEarn', fmt(wGross)); set('weekExp', fmt(wExp)); set('weekTax', fmt(wTax));
  set('weekTaxNote', Math.round(taxRate * 100) + '% of earnings');

  // Glance
  const todayHours = sum(todayInc, 'hours');
  const todayMiles = sum(todayInc, 'miles');
  const todayGross = sum(todayInc, 'amount') + sum(todayInc, 'tips');
  const todayExp2 = sum(todayExp, 'amount');
  const todayProfit = todayGross - todayExp2 - (Math.max(0, todayGross - todayExp2) * 0.9235 * taxRate);
  set('glanceHours', todayHours > 0 ? todayHours.toFixed(1) + 'h' : '0h');
  set('glanceMiles', todayMiles > 0 ? todayMiles.toFixed(0) + ' mi' : '0 mi');
  set('glanceHourly', todayHours > 0 ? fmt(todayProfit / todayHours) + '/hr' : '$0/hr');

  // Insight
  generateInsight(inc, weekInc);

  // Recent activity
  const all = [...(inc || []).map(r => ({ ...r, kind: 'income' })), ...(exp || []).map(r => ({ ...r, kind: 'expense' }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const ra = document.getElementById('recentActivity');
  if (all.length === 0) { ra.innerHTML = '<div class="empty-wrap"><div class="empty-icon">💸</div><p>No activity yet. Log your first income!</p></div>'; return; }
  ra.innerHTML = all.map(r => {
    const isInc = r.kind === 'income';
    const amt = isInc ? parseFloat(r.amount) + parseFloat(r.tips || 0) : parseFloat(r.amount);
    return `<div class="act-item">
      <div class="act-icon ${isInc ? 'income' : 'expense'}">${isInc ? '💰' : getCatEmoji(r.category)}</div>
      <div class="act-info"><div class="act-name">${isInc ? r.platform : r.category}</div><div class="act-type">${isInc ? 'Earnings' : 'Expense'}</div></div>
      <div class="act-right"><div class="act-amt ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '-'}${fmt(amt)}</div><div class="act-time">${formatDate(r.date)}</div></div>
    </div>`;
  }).join('');
}

function generateInsight(inc, weekInc) {
  const msgs = [];
  if (!inc || inc.length === 0) { set('insightMsg', 'Log income to see your personalized insights.'); return; }
  const total = sum(inc, 'amount') + sum(inc, 'tips');
  if (total > 0) msgs.push(`You earned ${fmt(total)} in the selected period. Keep it up!`);
  const platforms = {};
  (weekInc || []).forEach(r => { platforms[r.platform] = (platforms[r.platform] || 0) + parseFloat(r.amount) + parseFloat(r.tips || 0); });
  const top = Object.entries(platforms).sort((a,b) => b[1]-a[1])[0];
  if (top) msgs.push(`${top[0]} is your top platform this week with ${fmt(top[1])}.`);
  set('insightMsg', msgs[Math.floor(Math.random() * msgs.length)] || 'Keep logging to see insights!');
}

// ── EARNINGS ──────────────────────────────────
function setEarnFilter(f, btn) {
  earnFilter = f;
  document.querySelectorAll('#earningsPage .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadEarnings();
}

async function loadEarnings() {
  if (!currentUser) return;
  const { start, end } = getRange(earnFilter);
  const { data: inc } = await db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end).order('date', { ascending: false });

  const total = sum(inc, 'amount') + sum(inc, 'tips');
  set('earnTotal', fmt(total));

  // Platform breakdown
  const byPlat = {};
  (inc || []).forEach(r => { const p = r.platform; byPlat[p] = (byPlat[p] || 0) + parseFloat(r.amount) + parseFloat(r.tips || 0); });
  const platColors = ['#00d4aa','#3b82f6','#fbbf24','#f87171','#a78bfa','#34d399','#fb923c'];
  const platEntries = Object.entries(byPlat).sort((a,b) => b[1]-a[1]);
  const pl = document.getElementById('platformList');
  if (platEntries.length === 0) { pl.innerHTML = '<div class="empty-wrap"><p>No earnings in this period</p></div>'; }
  else pl.innerHTML = platEntries.map(([p, amt], i) => {
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    return `<div class="plat-item">
      <div class="plat-dot" style="background:${platColors[i%platColors.length]}"></div>
      <div class="plat-info"><div class="plat-name">${p}</div><div class="plat-bar-wrap"><div class="plat-bar" style="width:${pct}%;background:${platColors[i%platColors.length]}"></div></div></div>
      <div class="plat-right"><div class="plat-amt">${fmt(amt)}</div><div class="plat-pct">${pct}%</div></div>
    </div>`;
  }).join('');

  // Chart
  drawEarnChart(inc || [], start, end, earnFilter);

  // History
  const hl = document.getElementById('historyList');
  if (!inc || inc.length === 0) { hl.innerHTML = ''; return; }
  const byDate = {};
  inc.forEach(r => { byDate[r.date] = byDate[r.date] || { amt: 0, platforms: new Set() }; byDate[r.date].amt += parseFloat(r.amount) + parseFloat(r.tips || 0); byDate[r.date].platforms.add(r.platform); });
  const sorted = Object.entries(byDate).sort((a,b) => b[0].localeCompare(a[0])).slice(0, 10);
  hl.innerHTML = sorted.map(([date, d]) => `
    <div class="hist-item">
      <div><div class="hist-date">${formatDateLong(date)}</div><div class="hist-platforms">${[...d.platforms].join(', ')}</div></div>
      <div class="hist-amt">${fmt(d.amt)}</div>
    </div>`).join('');
}

function drawEarnChart(inc, start, end, period) {
  const canvas = document.getElementById('earnChart');
  if (!canvas) return;
  setupCanvas(canvas, 180);
  const ctx = canvas.getContext('2d');
  const W = parseInt(canvas.style.width), H = 180;
  const padL = 8, padR = 8, padT = 20, padB = 28, cW = W-padL-padR, cH = H-padT-padB;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

  const labels = [], data = [];
  if (period === 'day') {
    // Hours 6am-10pm
    for (let h = 6; h <= 22; h += 2) { labels.push(h < 12 ? h+'am' : h===12 ? '12pm' : (h-12)+'pm'); data.push(0); }
    inc.forEach(r => { const hr = new Date(r.date + 'T12:00:00').getHours(); const i = Math.floor((hr-6)/2); if(i>=0&&i<data.length) data[i] += parseFloat(r.amount)+parseFloat(r.tips||0); });
  } else if (period === 'week') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const startD = new Date(start+'T00:00:00');
    for (let i = 0; i < 7; i++) { const d = new Date(startD); d.setDate(d.getDate()+i); labels.push(days[d.getDay()]); data.push(0); }
    inc.forEach(r => { const d = new Date(r.date+'T00:00:00'); const i = Math.round((d-startD)/(86400000)); if(i>=0&&i<7) data[i] += parseFloat(r.amount)+parseFloat(r.tips||0); });
  } else if (period === 'month') {
    const now = new Date(); const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d += 3) { labels.push(d+''); data.push(0); }
    inc.forEach(r => { const day = parseInt(r.date.split('-')[2]); const i = Math.floor((day-1)/3); if(i<data.length) data[i] += parseFloat(r.amount)+parseFloat(r.tips||0); });
  } else {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    months.forEach(m => { labels.push(m); data.push(0); });
    inc.forEach(r => { const m = parseInt(r.date.split('-')[1])-1; data[m] += parseFloat(r.amount)+parseFloat(r.tips||0); });
  }

  const maxVal = Math.max(...data, 1);
  ctx.clearRect(0, 0, W, H);
  const textColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const n = labels.length;
  const barW = (cW / n) * 0.55;
  const barGap = cW / n;

  data.forEach((val, i) => {
    const x = padL + barGap * i + (barGap - barW) / 2;
    const bh = Math.max((val / maxVal) * cH, val > 0 ? 3 : 0);
    const grad = ctx.createLinearGradient(0, padT+cH-bh, 0, padT+cH);
    grad.addColorStop(0, '#00d4aa'); grad.addColorStop(1, 'rgba(0,212,170,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x, padT+cH-bh, barW, Math.max(bh,1), 4); ctx.fill();
    ctx.fillStyle = textColor; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW/2, H-8);
  });
}

// ── EXPENSES ──────────────────────────────────
function setExpFilter(f, btn) {
  expFilter = f;
  document.querySelectorAll('#expensesPage .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadExpenses();
}

async function loadExpenses() {
  if (!currentUser) return;
  const { start, end } = getRange(expFilter);
  const { data: exp } = await db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end).order('date', { ascending: false });

  const total = sum(exp, 'amount');
  set('expTotal', fmt(total));

  drawExpChart(exp || []);

  const el = document.getElementById('expenseList');
  if (!exp || exp.length === 0) { el.innerHTML = '<div class="empty-wrap"><div class="empty-icon">📋</div><h3>No expenses yet</h3><p>Track gas, repairs, and more</p></div>'; return; }
  el.innerHTML = exp.map(r => `
    <div class="entry-item">
      <div class="entry-icon exp">${getCatEmoji(r.category)}</div>
      <div class="entry-info">
        <div class="entry-name">${r.category}</div>
        <div class="entry-meta">${formatDate(r.date)}${r.notes ? ' · ' + r.notes : ''}${r.is_deductible ? ' · Deductible' : ''}</div>
      </div>
      <div class="entry-right">
        <div class="entry-amt neg">-${fmt(parseFloat(r.amount))}</div>
      </div>
      <div class="entry-actions">
        <button class="entry-edit" onclick="editExpense('${r.id}')">✏️</button>
        <button class="entry-del" onclick="deleteExpense('${r.id}')">🗑</button>
      </div>
    </div>`).join('');
}

function drawExpChart(expenses) {
  const canvas = document.getElementById('expChart');
  if (!canvas) return;
  setupCanvas(canvas, 160);
  const ctx = canvas.getContext('2d');
  const W = parseInt(canvas.style.width), H = 160;
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const cx = W * 0.35, cy = H/2, R = Math.min(cx, cy) * 0.82, r = R * 0.55;

  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount); });
  const entries = Object.entries(byCategory).sort((a,b) => b[1]-a[1]);
  const total = entries.reduce((s,[,v]) => s+v, 0);
  const colors = ['#f87171','#fbbf24','#fb923c','#f472b6','#a78bfa','#60a5fa','#34d399','#94a3b8'];

  ctx.clearRect(0, 0, W, H);
  if (total === 0) {
    const tc = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    ctx.fillStyle = tc; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('No expenses', cx, cy); return;
  }

  let angle = -Math.PI/2;
  entries.forEach(([,val], i) => {
    const slice = (val/total) * Math.PI*2;
    ctx.fillStyle = colors[i%colors.length];
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,angle,angle+slice); ctx.closePath(); ctx.fill();
    angle += slice;
  });
  ctx.fillStyle = isDark ? '#0f1625' : '#ffffff';
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f87171'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(fmt(total), cx, cy-3);
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  ctx.font = '9px sans-serif'; ctx.fillText('total', cx, cy+11);

  const lx = W*0.67, ly0 = cy - (Math.min(entries.length,5)*18)/2;
  entries.slice(0,5).forEach(([cat, val], i) => {
    const y = ly0 + i*20;
    ctx.fillStyle = colors[i%colors.length]; ctx.fillRect(lx-18, y-6, 8, 8);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(cat.length > 9 ? cat.slice(0,9)+'…' : cat, lx-7, y+3);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
    ctx.fillText(Math.round((val/total)*100)+'%', lx-7, y+13);
  });
}

// ── INCOME CRUD ───────────────────────────────
function showAddIncome() {
  editingId = null;
  document.getElementById('incomeModalTitle').textContent = 'Log Income';
  document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('incomePlatform').value = userProfile?.platforms?.[0] || 'Uber';
  ['incomeAmount','incomeTips','incomeHours','incomeMiles','incomeNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('incomeModal').classList.add('active');
}

async function editIncome(id) {
  const { data } = await db.from('gp_income').select('*').eq('id', id).single();
  if (!data) return;
  editingId = id;
  document.getElementById('incomeModalTitle').textContent = 'Edit Income';
  document.getElementById('incomePlatform').value = data.platform;
  document.getElementById('incomeAmount').value = data.amount;
  document.getElementById('incomeTips').value = data.tips || '';
  document.getElementById('incomeHours').value = data.hours || '';
  document.getElementById('incomeMiles').value = data.miles || '';
  document.getElementById('incomeDate').value = data.date;
  document.getElementById('incomeNotes').value = data.notes || '';
  document.getElementById('incomeModal').classList.add('active');
}

async function deleteIncome(id) {
  if (!confirm('Delete this entry?')) return;
  await db.from('gp_income').delete().eq('id', id);
  toast('Deleted', 'success'); loadEarnings();
}

async function saveIncome() {
  const btn = document.getElementById('saveIncomeBtn');
  const amount = parseFloat(document.getElementById('incomeAmount').value);
  const date = document.getElementById('incomeDate').value;
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  if (!date) return toast('Select a date', 'error');
  setLoading(btn, true, 'Saving...');
  const rec = { user_id: currentUser.id, platform: document.getElementById('incomePlatform').value, amount, tips: parseFloat(document.getElementById('incomeTips').value)||0, hours: parseFloat(document.getElementById('incomeHours').value)||null, miles: parseFloat(document.getElementById('incomeMiles').value)||null, date, notes: document.getElementById('incomeNotes').value.trim() };
  const { error } = editingId ? await db.from('gp_income').update(rec).eq('id', editingId) : await db.from('gp_income').insert(rec);
  setLoading(btn, false, 'Save');
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(editingId ? 'Updated!' : 'Saved!', 'success');
  closeModal('incomeModal'); loadEarnings();
}

// ── EXPENSE CRUD ──────────────────────────────
function showAddExpense() {
  editingId = null;
  document.getElementById('expenseModalTitle').textContent = 'Add Expense';
  document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('expenseCategory').value = 'Gas';
  ['expenseAmount','expenseNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('expenseDeductible').checked = true;
  document.getElementById('expenseModal').classList.add('active');
}

async function editExpense(id) {
  const { data } = await db.from('gp_expenses').select('*').eq('id', id).single();
  if (!data) return;
  editingId = id;
  document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
  document.getElementById('expenseCategory').value = data.category;
  document.getElementById('expenseAmount').value = data.amount;
  document.getElementById('expenseDate').value = data.date;
  document.getElementById('expenseNotes').value = data.notes || '';
  document.getElementById('expenseDeductible').checked = data.is_deductible;
  document.getElementById('expenseModal').classList.add('active');
}

async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await db.from('gp_expenses').delete().eq('id', id);
  toast('Deleted', 'success'); loadExpenses();
}

async function saveExpense() {
  const btn = document.getElementById('saveExpenseBtn');
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  if (!amount || amount <= 0) return toast('Enter a valid amount', 'error');
  setLoading(btn, true, 'Saving...');
  const rec = { user_id: currentUser.id, category: document.getElementById('expenseCategory').value, amount, date, notes: document.getElementById('expenseNotes').value.trim(), is_deductible: document.getElementById('expenseDeductible').checked };
  const { error } = editingId ? await db.from('gp_expenses').update(rec).eq('id', editingId) : await db.from('gp_expenses').insert(rec);
  setLoading(btn, false, 'Save');
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(editingId ? 'Updated!' : 'Saved!', 'success');
  closeModal('expenseModal'); loadExpenses();
}

// ── REPORTS ───────────────────────────────────
function initReportMonths() {
  const sel = document.getElementById('reportMonth');
  if (!sel) return;
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const opt = document.createElement('option');
    opt.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    opt.textContent = `${months[d.getMonth()]} ${d.getFullYear()}`;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }
}

async function loadReports() {
  if (!currentUser) return;
  const sel = document.getElementById('reportMonth');
  const [year, month] = (sel?.value || new Date().toISOString().slice(0,7)).split('-').map(Number);
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];

  const [{ data: inc }, { data: exp }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', start).lte('date', end)
  ]);

  const gross = sum(inc, 'amount') + sum(inc, 'tips');
  const expenses = sum(exp, 'amount');
  const miles = sum(inc, 'miles');
  const mileDeduct = miles * 0.70;
  const taxRate = userProfile?.country === 'CA' ? 0.28 : 0.153;
  const tax = Math.max(0, gross - expenses) * 0.9235 * taxRate;
  const net = gross - expenses - tax;

  set('roNet', fmt(net));
  set('roEarn', fmt(gross));
  set('roExp', fmt(expenses));
  set('roTax', fmt(tax));
  set('roMiles', fmt(mileDeduct));

  loadQuarterlyTax(year, taxRate);
}

async function loadQuarterlyTax(year, taxRate) {
  const yr = year || new Date().getFullYear();
  const tr = taxRate || (userProfile?.country === 'CA' ? 0.28 : 0.153);
  const currentQ = Math.floor(new Date().getMonth() / 3) + 1;
  set('taxYearLabel', yr + ' Quarterly Tax');

  const quarters = [
    { q:1, label:'Q1', months:'Jan – Mar', start:`${yr}-01-01`, end:`${yr}-03-31`, due:`Apr 15, ${yr}` },
    { q:2, label:'Q2', months:'Apr – Jun', start:`${yr}-04-01`, end:`${yr}-06-30`, due:`Jun 16, ${yr}` },
    { q:3, label:'Q3', months:'Jul – Sep', start:`${yr}-07-01`, end:`${yr}-09-30`, due:`Sep 15, ${yr}` },
    { q:4, label:'Q4', months:'Oct – Dec', start:`${yr}-10-01`, end:`${yr}-12-31`, due:`Jan 15, ${yr+1}` }
  ];

  const [{ data: inc }, { data: exp }] = await Promise.all([
    db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', `${yr}-01-01`),
    db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', `${yr}-01-01`)
  ]);

  const html = quarters.map(({ q, label, months, start, end, due }) => {
    const qi = (inc||[]).filter(r => r.date >= start && r.date <= end);
    const qe = (exp||[]).filter(r => r.date >= start && r.date <= end);
    const gross = sum(qi, 'amount') + sum(qi, 'tips');
    const expenses = sum(qe, 'amount');
    const miles = sum(qi, 'miles') * 0.70;
    const net = Math.max(0, gross - expenses - miles);
    const tax = net * 0.9235 * tr;
    const status = q < currentQ ? 'past' : q === currentQ ? 'current' : 'future';
    const badge = q < currentQ ? '✅ Past' : q === currentQ ? '⚡ Current' : '🔜 Upcoming';
    return `<div class="quarter-card ${status === 'current' ? 'active-q' : ''}">
      <div class="q-header">
        <div><div class="q-title">${label}</div><div class="q-months">${months}</div></div>
        <div class="q-badge ${status}">${badge}</div>
      </div>
      <div class="q-rows">
        <div class="q-row"><span>Gross Income</span><span class="positive">${fmt(gross)}</span></div>
        <div class="q-row"><span>Expenses</span><span class="negative">-${fmt(expenses)}</span></div>
        <div class="q-row"><span>Mileage Deduction</span><span class="negative">-${fmt(miles)}</span></div>
        <div class="q-row"><span>Net Profit</span><span>${fmt(net)}</span></div>
      </div>
      <div class="q-tax-box"><span class="q-tax-label">Est. Tax Due</span><span class="q-tax-amt">${fmt(tax)}</span></div>
      <div class="q-due">📅 Due: ${due}</div>
      ${status === 'current' ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(0,212,170,0.06);border-radius:8px;font-size:0.8rem;color:var(--green)">💡 Set aside ${fmt(tax)} by ${due}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('quarterCards').innerHTML = html;
}

function showQuarterlyTax() { document.getElementById('quarterCards').scrollIntoView({ behavior: 'smooth' }); }
function showMileageReport() { toast('Mileage shown in quarterly cards above', 'success'); }
function showProfitLoss() { toast('See the month overview above', 'success'); }

// ── PROFILE ───────────────────────────────────
async function loadProfilePage() {
  if (!userProfile) return;
  const name = userProfile.full_name || 'Driver';
  const email = currentUser.email;
  const masked = email.split('@')[0].slice(0,4) + '****@' + email.split('@')[1];
  set('profileName', name);
  set('profileEmail', masked);
  set('siGoal', fmt(userProfile.monthly_goal || 0));
  set('siCurrency', userProfile.currency || 'USD');
  const theme = document.documentElement.getAttribute('data-theme');
  set('siTheme', (theme === 'dark' ? 'Dark' : 'Light') + ' ›');
  const pp = document.getElementById('profilePlatforms');
  const plats = userProfile.platforms || [];
  pp.innerHTML = plats.length === 0 ? '<p style="padding:12px 16px;color:var(--text2);font-size:0.85rem">No platforms set</p>' : plats.map(p => `<div class="plat-chip">${p}</div>`).join('');
}

// ── EXPORT ────────────────────────────────────
function showExportModal() {
  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('exportFrom').value = `${y}-${m}-01`;
  document.getElementById('exportTo').value = now.toISOString().split('T')[0];
  document.getElementById('exportModal').classList.add('active');
}

function setRange(r, btn) {
  document.querySelectorAll('.range-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
  let from, to = now;
  if (r === 'this-month') from = new Date(y, m, 1);
  else if (r === 'last-month') { from = new Date(y, m-1, 1); to = new Date(y, m, 0); }
  else if (r === 'this-quarter') { const q = Math.floor(m/3); from = new Date(y, q*3, 1); }
  else if (r === 'this-year') from = new Date(y, 0, 1);
  else if (r === 'all-time') from = new Date(2020, 0, 1);
  document.getElementById('exportFrom').value = from.toISOString().split('T')[0];
  document.getElementById('exportTo').value = to.toISOString().split('T')[0];
}

async function runExport() {
  const from = document.getElementById('exportFrom').value;
  const to = document.getElementById('exportTo').value;
  const dataType = document.querySelector('input[name="expData"]:checked')?.value || 'all';
  const fmt2 = document.querySelector('input[name="expFmt"]:checked')?.value || 'pdf';
  const btn = document.getElementById('runExportBtn');
  if (!from || !to) return toast('Select a date range', 'error');
  setLoading(btn, true, 'Preparing...');
  let inc = [], exp = [];
  if (dataType !== 'expenses') { const { data } = await db.from('gp_income').select('*').eq('user_id', currentUser.id).gte('date', from).lte('date', to).order('date', { ascending: false }); inc = data || []; }
  if (dataType !== 'income') { const { data } = await db.from('gp_expenses').select('*').eq('user_id', currentUser.id).gte('date', from).lte('date', to).order('date', { ascending: false }); exp = data || []; }
  setLoading(btn, false, 'Export');
  if (inc.length === 0 && exp.length === 0) { toast('No data found for this range', 'error'); return; }
  closeModal('exportModal');
  const label = from + ' to ' + to;
  fmt2 === 'csv' ? exportCSV(inc, exp, label) : exportPDF(inc, exp, label);
}

function exportCSV(income, expenses, label) {
  const totalIncome = income.reduce((s,r) => s+parseFloat(r.amount)+parseFloat(r.tips||0), 0);
  const totalExp = expenses.reduce((s,r) => s+parseFloat(r.amount), 0);
  const csv = [
    [`GIGPROFIT EXPORT — ${label}`], [],
    ['=== INCOME ==='],
    ['Date','Platform','Earnings','Tips','Total','Hours','Miles','Notes'],
    ...income.map(r => [r.date,r.platform,r.amount,r.tips||0,(parseFloat(r.amount)+parseFloat(r.tips||0)).toFixed(2),r.hours||'',r.miles||'',r.notes||'']),
    [], ['=== EXPENSES ==='],
    ['Date','Category','Amount','Deductible','Notes'],
    ...expenses.map(r => [r.date,r.category,r.amount,r.is_deductible?'Yes':'No',r.notes||'']),
    [], ['=== SUMMARY ==='],
    ['Total Income', totalIncome.toFixed(2)],
    ['Total Expenses', totalExp.toFixed(2)],
    ['Net', (totalIncome-totalExp).toFixed(2)]
  ].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `GigProfit-Export.csv`; a.click();
  toast('CSV downloaded!', 'success');
}

function exportPDF(income, expenses, label) {
  const totalInc = income.reduce((s,r) => s+parseFloat(r.amount)+parseFloat(r.tips||0), 0);
  const totalExp = expenses.reduce((s,r) => s+parseFloat(r.amount), 0);
  const miles = income.reduce((s,r) => s+parseFloat(r.miles||0), 0);
  const taxRate = userProfile?.country === 'CA' ? 0.28 : 0.153;
  const tax = Math.max(0,totalInc-totalExp)*0.9235*taxRate;
  const net = totalInc-totalExp-tax;
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>GigProfit Tax Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;font-size:12px}.logo{font-size:20px;font-weight:800;color:#00d4aa}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:20px 0}.card{background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #00d4aa}.label{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px}.val{font-size:16px;font-weight:800}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}th{background:#f0f0f0;padding:8px;text-align:left;font-weight:700}td{padding:7px;border-bottom:1px solid #f0f0f0}.disc{background:#fff8e6;border:1px solid #ffd980;border-radius:6px;padding:10px;font-size:10px;color:#7a5c00;margin-top:20px}</style></head><body>
  <div class="logo">GigProfit</div><div style="color:#888;font-size:11px;margin-bottom:20px">Tax Report · ${label} · Generated ${new Date().toLocaleDateString()}</div>
  <div class="grid"><div class="card"><div class="label">Total Income</div><div class="val" style="color:#00d4aa">${fmt(totalInc)}</div></div><div class="card" style="border-color:#f87171"><div class="label">Total Expenses</div><div class="val" style="color:#f87171">${fmt(totalExp)}</div></div><div class="card" style="border-color:#fbbf24"><div class="label">Est. Tax</div><div class="val" style="color:#fbbf24">${fmt(tax)}</div></div><div class="card" style="border-color:#3b82f6"><div class="label">Net Profit</div><div class="val">${fmt(net)}</div></div><div class="card" style="border-color:#3b82f6"><div class="label">Total Miles</div><div class="val">${miles.toFixed(1)} mi</div></div><div class="card" style="border-color:#a78bfa"><div class="label">Mile Deduction</div><div class="val">${fmt(miles*0.70)}</div></div></div>
  <h3 style="margin:20px 0 8px">Income (${income.length} entries)</h3><table><tr><th>Date</th><th>Platform</th><th>Amount</th><th>Tips</th><th>Miles</th></tr>${income.map(r=>`<tr><td>${r.date}</td><td>${r.platform}</td><td>$${parseFloat(r.amount).toFixed(2)}</td><td>$${parseFloat(r.tips||0).toFixed(2)}</td><td>${r.miles||0}</td></tr>`).join('')}</table>
  <h3 style="margin:20px 0 8px">Expenses (${expenses.length} entries)</h3><table><tr><th>Date</th><th>Category</th><th>Amount</th><th>Deductible</th></tr>${expenses.map(r=>`<tr><td>${r.date}</td><td>${r.category}</td><td>$${parseFloat(r.amount).toFixed(2)}</td><td>${r.is_deductible?'Yes':'No'}</td></tr>`).join('')}</table>
  <div class="disc">⚠️ This report is for informational purposes only and does not constitute tax advice. Consult a qualified tax professional.</div>
  </body></html>`);
  win.document.close(); setTimeout(() => win.print(), 500);
  toast('PDF ready — use Print to save', 'success');
}

// ── HELPERS ───────────────────────────────────
function getRange(period) {
  const now = new Date(), today = now.toISOString().split('T')[0];
  if (period === 'today') return { start: today, end: today };
  if (period === 'day') return { start: today, end: today };
  if (period === 'week') {
    const day = now.getDay(), mon = new Date(now);
    mon.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    return { start: mon.toISOString().split('T')[0], end: today };
  }
  if (period === 'month') {
    return { start: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, end: today };
  }
  if (period === 'year') return { start: `${now.getFullYear()}-01-01`, end: today };
  return { start: today, end: today };
}

function sum(arr, field) { return (arr || []).reduce((s, r) => s + parseFloat(r[field] || 0), 0); }
function fmt(n) { return '$' + Math.abs(parseFloat(n)||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(d) { if (!d) return ''; return new Date(d+'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function formatDateLong(d) { if (!d) return ''; return new Date(d+'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); editingId = null; }
function setLoading(btn, loading, text) { if (!btn) return; btn.disabled = loading; btn.textContent = text; }
function getCatEmoji(cat) { const m = { 'Gas': '⛽', 'Car Repair': '🔧', 'Car Wash': '🚿', 'Insurance': '🛡', 'Phone Bill': '📱', 'Tolls': '🛣', 'Parking': '🅿️', 'Food & Drinks': '☕', 'Other': '📦' }; return m[cat] || '📋'; }

function setupCanvas(canvas, h) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement?.clientWidth - 32 || 300;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
}

function toast(msg, type = 'success') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}
