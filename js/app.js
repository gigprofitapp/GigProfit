// ═══ GIGPROFIT v4 — CORE APP ════════════════
const SUPABASE_URL='https://avydceapvbefcaquvazq.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2eWRjZWFwdmJlZmNhcXV2YXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MTU2OTYsImV4cCI6MjA5NjE5MTY5Nn0.VKU-cx37t9Np7DB_1T7kPVeGmkp_CZEEgeo0dqe4BPQ';
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null,userProfile=null,editingId=null;
let homePeriod='today',earnFilter='week',expFilter='week';
let obData={platforms:[],country:'US',currency:'USD',tax_status:'single',monthly_goal:3000};

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded',async()=>{
  applyTheme(localStorage.getItem('gp-theme')||'dark');
  initReportMonths();
  const {data:{session}}=await db.auth.getSession();
  if(session){currentUser=session.user;await loadProfile();}
  else showPage('auth');
  db.auth.onAuthStateChange(async(e,s)=>{
    if(e==='SIGNED_IN'&&s){currentUser=s.user;await loadProfile();}
    else if(e==='SIGNED_OUT'){currentUser=null;userProfile=null;showPage('auth');}
  });
});

// ── THEME ────────────────────────────────────
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  applyTheme(t);localStorage.setItem('gp-theme',t);
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  const icon=document.getElementById('themeIcon');
  if(icon){
    if(t==='dark') icon.innerHTML='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    else icon.innerHTML='<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
  const si=document.getElementById('siTheme');
  if(si) si.innerHTML=(t==='dark'?'Dark':'Light')+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
}

// ── AUTH ─────────────────────────────────────
function switchAuthTab(tab,el){
  document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
  el.classList.add('active');
  document.getElementById(tab+'Form').classList.add('active');
}
async function signIn(){
  const email=document.getElementById('loginEmail').value.trim();
  const pw=document.getElementById('loginPassword').value;
  if(!email||!pw) return toast('Please fill all fields','error');
  const btn=document.getElementById('signInBtn');
  setLoading(btn,true,'Signing in...');
  const {error}=await db.auth.signInWithPassword({email,password:pw});
  setLoading(btn,false,'Sign In');
  if(error) toast(error.message,'error');
}
async function signUp(){
  const name=document.getElementById('signupName').value.trim();
  const email=document.getElementById('signupEmail').value.trim();
  const pw=document.getElementById('signupPassword').value;
  if(!name||!email||!pw) return toast('Please fill all fields','error');
  if(pw.length<6) return toast('Password must be 6+ characters','error');
  const btn=document.getElementById('signUpBtn');
  setLoading(btn,true,'Creating...');
  const {error}=await db.auth.signUp({email,password:pw,options:{data:{full_name:name}}});
  setLoading(btn,false,'Create Account');
  if(error) toast(error.message,'error');
  else toast('Account created! Check your email.','success');
}
async function signInWithGoogle(){
  const {error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://gigprofitapp.github.io/GigProfit/'}});
  if(error) toast(error.message,'error');
}
async function signOut(){await db.auth.signOut();}

// ── PROFILE LOAD ─────────────────────────────
async function loadProfile(){
  const {data}=await db.from('profiles').select('*').eq('user_id',currentUser.id).single();
  userProfile=data;
  if(!userProfile||!userProfile.onboarding_done) startOnboarding();
  else showPage('home');
}

// ── ONBOARDING ───────────────────────────────
function startOnboarding(){
  obData={platforms:[],country:'US',currency:'USD',tax_status:'single',monthly_goal:3000};
  document.getElementById('appShell').classList.remove('visible');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('onboardingPage').classList.add('active');
  showObStep(1);
}
function showObStep(n){
  document.querySelectorAll('.ob-step').forEach(s=>s.classList.remove('active'));
  document.getElementById('ob'+n)?.classList.add('active');
  document.querySelectorAll('.ob-dot').forEach((d,i)=>{
    d.classList.toggle('active',i+1===n);d.classList.toggle('done',i+1<n);
  });
}
function togglePlatform(el,p){
  el.classList.toggle('selected');
  if(el.classList.contains('selected')){if(!obData.platforms.includes(p))obData.platforms.push(p);}
  else obData.platforms=obData.platforms.filter(x=>x!==p);
}
function obNext(step){
  if(step===2&&obData.platforms.length===0)return toast('Select at least one platform','error');
  if(step===3){obData.country=document.getElementById('obCountry').value;obData.currency=document.getElementById('obCurrency').value;}
  if(step===4){obData.tax_status=document.getElementById('obTaxStatus').value;}
  showObStep(step);
}
function obPrev(step){showObStep(step);}
async function finishOnboarding(){
  const goal=parseFloat(document.getElementById('obGoal').value)||0;
  obData.monthly_goal=goal;
  const btn=document.getElementById('obFinishBtn');
  setLoading(btn,true,'Setting up...');
  const pd={user_id:currentUser.id,full_name:currentUser.user_metadata?.full_name||currentUser.email.split('@')[0],country:obData.country,currency:obData.currency,tax_status:obData.tax_status,platforms:obData.platforms,monthly_goal:obData.monthly_goal,onboarding_done:true};
  const {error}=await db.from('profiles').upsert(pd,{onConflict:'user_id'});
  setLoading(btn,false,'Get Started 🚀');
  if(error){toast('Error: '+error.message,'error');return;}
  const {data}=await db.from('profiles').select('*').eq('user_id',currentUser.id).single();
  userProfile=data;showPage('home');
}

// ── NAVIGATION ───────────────────────────────
function showPage(page){
  const standalone=['auth','onboarding'];
  if(standalone.includes(page)){
    document.getElementById('appShell').classList.remove('visible');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(page+'Page')?.classList.add('active');return;
  }
  document.getElementById('appShell').classList.add('visible');
  document.querySelectorAll('.app-shell>.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(page+'Page')?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const loaders={home:loadHome,earnings:loadEarnings,expenses:loadExpenses,reports:loadReports,profile:loadProfilePage};
  loaders[page]?.();
}

// ── HOME ─────────────────────────────────────
function togglePeriodDropdown(){
  const dd=document.getElementById('periodDropdown');
  dd.style.display=dd.style.display==='none'?'block':'none';
  // Close on outside click
  setTimeout(()=>{
    document.addEventListener('click',closePeriodDropdown,{once:true});
  },10);
}
function closePeriodDropdown(){
  const dd=document.getElementById('periodDropdown');
  if(dd)dd.style.display='none';
}
function setPeriod(period,label){
  homePeriod=period;
  document.getElementById('periodLabel').textContent=label;
  // Update active state
  document.querySelectorAll('.period-dropdown button').forEach(b=>{
    b.classList.toggle('active',b.textContent===label);
  });
  document.getElementById('periodDropdown').style.display='none';
  // Update hero label
  const heroLabel={today:"TODAY'S PROFIT",week:"THIS WEEK'S PROFIT",month:"THIS MONTH'S PROFIT"};
  const lbl=document.querySelector('.ph-label');
  if(lbl)lbl.textContent=heroLabel[period]||"TODAY'S PROFIT";
  // Update sub text
  const sub={today:'What you actually kept today',week:'What you actually kept this week',month:'What you actually kept this month'};
  const subEl=document.querySelector('.ph-sub');
  if(subEl)subEl.textContent=sub[period];
  loadHome();
}

async function loadHome(){
  if(!currentUser)return;
  const firstName=(userProfile?.full_name||currentUser.email.split('@')[0]).split(' ')[0];
  const h=new Date().getHours();
  setText('homeGreeting',h<12?'Good morning,':h<17?'Good afternoon,':'Good evening,');
  setText('homeName',firstName+' 👋');

  const {start,end}=getRange(homePeriod);
  const today=new Date().toISOString().split('T')[0];
  const weekStart=getRange('week').start;
  const monthStart=getRange('month').start;

  const [
    {data:inc},{data:exp},
    {data:wInc},{data:wExp},
    {data:tInc},{data:tExp},
    {data:mInc},{data:mExpData}
  ]=await Promise.all([
    db.from('gp_income').select('*').eq('user_id',currentUser.id).gte('date',start).lte('date',end),
    db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',start).lte('date',end),
    db.from('gp_income').select('*').eq('user_id',currentUser.id).gte('date',weekStart).lte('date',today),
    db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',weekStart).lte('date',today),
    db.from('gp_income').select('*').eq('user_id',currentUser.id).eq('date',today),
    db.from('gp_expenses').select('*').eq('user_id',currentUser.id).eq('date',today),
    db.from('gp_income').select('amount,tips').eq('user_id',currentUser.id).gte('date',monthStart),
    db.from('gp_expenses').select('amount').eq('user_id',currentUser.id).gte('date',monthStart),
  ]);

  const txRate=userProfile?.country==='CA'?0.28:0.153;

  // Hero
  const gross=sumF(inc,'amount')+sumF(inc,'tips');
  const expenses=sumF(exp,'amount');
  const tax=Math.max(0,gross-expenses)*0.9235*txRate;
  const profit=gross-expenses-tax;
  setText('heroProfit',fmt(profit));
  const heroProfitEl=document.getElementById('heroProfit');
  if(heroProfitEl) heroProfitEl.style.color=profit<0?'var(--expense-color,#f16c6c)':'var(--profit-color,#00e5aa)';
  setText('heroEarnings',fmtShort(gross));
  setText('heroExpenses',fmtShort(expenses));
  setText('heroTax',fmtShort(tax));
  // Fix: show default only when truly no data (no income AND no expenses)
  const subEl=document.getElementById('heroSub');
  if(subEl){
    const hasData=(inc&&inc.length>0)||(exp&&exp.length>0);
    subEl.textContent=hasData?'After expenses & tax reserve':'Start logging to track your real profit';
  }

  // Goal — monthly
  const goal=userProfile?.monthly_goal||0;
  const mGross=sumF(mInc,'amount')+sumF(mInc,'tips');
  const mExp=sumF(mExpData,'amount');
  const mTax=Math.max(0,mGross-mExp)*0.9235*txRate;
  const mProfit=mGross-mExp-mTax;
  const pct=goal>0?Math.min(100,(mProfit/goal)*100):0;
  // Header goal card
  const goalCard=document.getElementById('homeGoalCard');
  const helperText=document.getElementById('homeHelperText');
  if(goal>0){
    if(goalCard) goalCard.style.display='flex';
    if(helperText) helperText.style.display='none';
    setText('hgcAmount',fmtShort(goal));
    setText('hgcPct',Math.round(pct)+'% of goal');
    const bar=document.getElementById('hgcBar');
    if(bar) bar.style.width=pct+'%';
    // Sub text under greeting — uses monthly goal and monthly profit
    const sub=document.getElementById('homeGoalSub');
    if(sub){
      sub.style.display='block';
      const remaining=goal-mProfit;
      sub.textContent=remaining>0?`You're ${fmtShort(remaining)} away from your monthly goal`:`Monthly goal reached! 🎉`;
    }
  }else{
    if(goalCard) goalCard.style.display='none';
    if(helperText) helperText.style.display='flex';
    const sub=document.getElementById('homeGoalSub');
    if(sub) sub.style.display='none';
  }
  // Keep profit card goal bar in sync too
  const goalRow=document.querySelector('.ph-goal-row');
  const goalBarEl=document.querySelector('.ph-bar');
  if(goalRow) goalRow.style.display=goal>0?'flex':'none';
  if(goalBarEl) goalBarEl.style.display=goal>0?'block':'none';
  setText('goalPctNum',Math.round(pct)+'%');
  setText('goalAmt',fmtShort(goal));
  const gf=document.getElementById('goalFill');
  if(gf) gf.style.width=pct+'%';

  // Week stats
  const wGross=sumF(wInc,'amount')+sumF(wInc,'tips');
  const wExpTotal=sumF(wExp,'amount');
  const wTax=Math.max(0,wGross-wExpTotal)*0.9235*txRate;
  const wProfit=wGross-wExpTotal-wTax;
  const wHours=sumF(wInc,'hours');
  const wProfitPerHr=wHours>0?(wProfit/wHours):0;
  setText('weekEarn',fmtShort(wProfit));
  const weekEarnEl=document.getElementById('weekEarn');
  if(weekEarnEl) weekEarnEl.style.color=wProfit<0?'var(--expense-color,#f16c6c)':'var(--profit-color,#00e5aa)';
  setText('weekExp',wHours>0?wHours.toFixed(1):'0.0');
  setText('weekTax',wProfitPerHr>0?fmtShort(wProfitPerHr):'$0');
  // Show helper text when no data
  const weekHelper=document.getElementById('weekHelper');
  if(weekHelper) weekHelper.style.display=wGross>0?'none':'block';

  // Glance
  const tHours=sumF(tInc,'hours');
  const tMiles=sumF(tInc,'miles');
  const tGross=sumF(tInc,'amount')+sumF(tInc,'tips');
  const tExpAmt=sumF(tExp,'amount');
  const tProfit=tGross-tExpAmt-(Math.max(0,tGross-tExpAmt)*0.9235*txRate);
  const glH=document.getElementById('glanceHours');
  const glM=document.getElementById('glanceMiles');
  const glR=document.getElementById('glanceHourly');
  if(glH) glH.innerHTML=tHours>0?`${tHours.toFixed(1)} <em>hrs</em>`:`0 <em>hrs</em>`;
  if(glM) glM.innerHTML=tMiles>0?`${Math.round(tMiles)} <em>mi</em>`:`0 <em>mi</em>`;
  if(glR) glR.innerHTML=tHours>0?`${fmtShort(tProfit/tHours)} <em>/hr</em>`:`$0 <em>/hr</em>`;

  // Insight
  buildInsight(wInc||[]);

  // Recent activity
  const all=[...(inc||[]).map(r=>({...r,_k:'income'})),...(exp||[]).map(r=>({...r,_k:'expense'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
  const ra=document.getElementById('recentActivity');
  const viewAllBtn=document.getElementById('viewAllBtn');
  if(!ra)return;
  if(all.length===0){
    if(viewAllBtn) viewAllBtn.style.display='none';
    ra.innerHTML=`<div class="ra-empty">
      <div class="ra-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
          <line x1="9" y1="17" x2="12" y2="17"/>
        </svg>
      </div>
      <div class="ra-empty-title">No activity yet</div>
      <div class="ra-empty-sub">Log your first earning to start tracking profit.</div>
    </div>`;
    return;
  }
  if(viewAllBtn) viewAllBtn.style.display='inline';
  ra.innerHTML=all.map(r=>{
    const isInc=r._k==='income';
    const amt=isInc?parseFloat(r.amount)+parseFloat(r.tips||0):parseFloat(r.amount);
    const cls=isInc?getPlatformClass(r.platform):'expense-generic';
    const icon=isInc?platformSvg(r.platform):expSvg();
    return `<div class="act-row">
      <div class="act-icon-wrap ${cls}">${icon}</div>
      <div class="act-info">
        <div class="act-name">${isInc?r.platform:r.category}</div>
        <div class="act-sub">${isInc?'Payment':'Expense'}</div>
      </div>
      <div class="act-right">
        <div class="act-amount ${isInc?'pos':'neg'}" style="${isInc?'color:var(--profit-color,#1ed8a4)':'color:var(--expense-color,#f16c6c)'}">${isInc?'':'−'}${fmt(amt)}</div>
        <div class="act-time">${formatDateShort(r.date)}</div>
      </div>
      <div class="act-actions">
        <button class="act-edit-btn" onclick="${isInc?`editIncome('${r.id}')`:`editExpense('${r.id}')`}" title="Edit">${editSvg()}</button>
        <button class="act-del-btn" onclick="${isInc?`deleteIncome('${r.id}')`:`deleteExpense('${r.id}')`}" title="Delete">${delSvg()}</button>
      </div>
    </div>`;
  }).join('');
}

function buildInsight(weekInc){
  const labelEl=document.getElementById('insightLabel');
  const icIcon=document.querySelector('.ic-icon');
  if(!weekInc||weekInc.length===0){
    if(labelEl) labelEl.textContent='Smart Insight';
    if(icIcon) icIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    setText('insightMsg','Log your first earning to unlock smart insights.');
    return;
  }
  // Has data — switch to analytics icon and show real insight
  if(labelEl) labelEl.textContent='Insight';
  if(icIcon) icIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
  const msgs=[];
  const byPlat={};
  weekInc.forEach(r=>{byPlat[r.platform]=(byPlat[r.platform]||0)+parseFloat(r.amount)+parseFloat(r.tips||0);});
  const top=Object.entries(byPlat).sort((a,b)=>b[1]-a[1])[0];
  if(top) msgs.push(`${top[0]} is your top platform this week with ${fmt(top[1])}.`);
  const total=sumF(weekInc,'amount')+sumF(weekInc,'tips');
  if(total>0) msgs.push(`You earned ${fmt(total)} this week. Keep pushing!`);
  setText('insightMsg',msgs[0]||'Keep logging to unlock more insights!');
}

// ── EARNINGS ─────────────────────────────────
function setEarnFilter(f,btn){
  earnFilter=f;
  document.querySelectorAll('#earningsPage .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  loadEarnings();
}

async function loadEarnings(){
  if(!currentUser)return;
  const {start,end}=getRange(earnFilter);
  const periodLabels={day:'Today',week:'This Week',month:'This Month',year:'This Year'};
  const el=document.getElementById('earnTotalLabel');
  if(el)el.textContent='EARNINGS — '+periodLabels[earnFilter].toUpperCase();

  const {data:inc}=await db.from('gp_income').select('*')
    .eq('user_id',currentUser.id)
    .gte('date',start).lte('date',end)
    .order('date',{ascending:false});

  const filtered=inc||[];
  const total=sumF(filtered,'amount')+sumF(filtered,'tips');
  setText('earnTotal',fmt(total));
  drawBarChart('earnChart',filtered,earnFilter,start,'#1ed8a4');

  // Platform breakdown
  const byPlat={};
  filtered.forEach(r=>{byPlat[r.platform]=(byPlat[r.platform]||0)+parseFloat(r.amount)+parseFloat(r.tips||0);});
  const entries=Object.entries(byPlat).sort((a,b)=>b[1]-a[1]);
  const colors=['#1ed8a4','#4a90d9','#f59e0b','#f16c6c','#8b5cf6','#34d399','#fb923c'];
  const pl=document.getElementById('platformList');
  if(pl){
    if(entries.length===0){
      pl.innerHTML='<div class="empty-wrap"><p>No earnings in this period</p></div>';
    }else{
      pl.innerHTML=entries.map(([p,amt],i)=>{
        const pct=total>0?Math.round((amt/total)*100):0;
        return `<div class="list-row">
          <div class="plat-dot" style="background:${colors[i%colors.length]}"></div>
          <div class="plat-info">
            <div class="plat-name">${p}</div>
            <div class="plat-bar-wrap"><div class="plat-bar" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
          </div>
          <div class="plat-right">
            <div class="plat-amt">${fmt(amt)}</div>
            <div class="plat-pct">${pct}%</div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // History with edit/delete per entry
  const hl=document.getElementById('historyList');
  if(!hl)return;
  if(filtered.length===0){
    hl.innerHTML='<div class="empty-wrap"><p>No entries in this period</p></div>';
    return;
  }
  hl.innerHTML=filtered.map(r=>{
    const amt=parseFloat(r.amount)+parseFloat(r.tips||0);
    return `<div class="hist-item">
      <div class="hist-left">
        <div class="hist-date">${formatDateLong(r.date)}</div>
        <div class="hist-platforms">${r.platform}${r.hours?' · '+r.hours+'hrs':''}${r.miles?' · '+r.miles+'mi':''}</div>
      </div>
      <div class="hist-amt">${fmt(amt)}</div>
      <div class="act-actions">
        <button class="act-edit-btn" onclick="editIncome('${r.id}')">${editSvg()}</button>
        <button class="act-del-btn" onclick="deleteIncome('${r.id}')">${delSvg()}</button>
      </div>
    </div>`;
  }).join('');
}

// ── EXPENSES ─────────────────────────────────
function setExpFilter(f,btn){
  expFilter=f;
  document.querySelectorAll('#expensesPage .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');loadExpenses();
}
async function loadExpenses(){
  if(!currentUser)return;
  const {start,end}=getRange(expFilter);
  const {data:exp}=await db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',start).lte('date',end).order('date',{ascending:false});
  const total=sumF(exp,'amount');
  setText('expTotal',fmt(total));
  drawDonut('expChart',exp||[]);
  const el=document.getElementById('expenseList');
  if(!el)return;
  if(!exp||exp.length===0){el.innerHTML='<div class="empty-wrap"><div class="empty-icon">📋</div><h3>No expenses yet</h3><p>Track gas, repairs, and more to calculate your real profit</p></div>';return;}
  el.innerHTML='<div class="entry-list">'+exp.map(r=>`<div class="entry-item">
    <div class="entry-icon exp">${expSvg()}</div>
    <div class="entry-info"><div class="entry-name">${r.category}</div><div class="entry-meta">${formatDate(r.date)}${r.notes?' · '+r.notes:''}${r.is_deductible?' · Deductible':''}</div></div>
    <div class="entry-right"><div class="entry-amt neg" style="color:var(--expense-color,#f16c6c)">-${fmt(parseFloat(r.amount))}</div></div>
    <div class="entry-actions">
      <button class="entry-edit" onclick="editExpense('${r.id}')">${editSvg()}</button>
      <button class="entry-del" onclick="deleteExpense('${r.id}')">${delSvg()}</button>
    </div>
  </div>`).join('')+'</div>';
}

// ── INCOME CRUD ──────────────────────────────
function showAddIncome(){
  editingId=null;
  document.getElementById('incomeModalTitle').textContent='Log Income';
  document.getElementById('incomeDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('incomePlatform').value=userProfile?.platforms?.[0]||'Uber';
  ['incomeAmount','incomeTips','incomeHours','incomeMiles','incomeNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('incomeModal').classList.add('active');
}
async function editIncome(id){
  const {data}=await db.from('gp_income').select('*').eq('id',id).single();if(!data)return;
  editingId=id;document.getElementById('incomeModalTitle').textContent='Edit Income';
  document.getElementById('incomePlatform').value=data.platform;document.getElementById('incomeAmount').value=data.amount;
  document.getElementById('incomeTips').value=data.tips||'';document.getElementById('incomeHours').value=data.hours||'';
  document.getElementById('incomeMiles').value=data.miles||'';document.getElementById('incomeDate').value=data.date;
  document.getElementById('incomeNotes').value=data.notes||'';document.getElementById('incomeModal').classList.add('active');
}
async function deleteIncome(id){
  if(!confirm('Delete this entry?'))return;
  await db.from('gp_income').delete().eq('id',id);
  toast('Deleted','success');
  loadEarnings();loadHome();
}
async function saveIncome(){
  const btn=document.getElementById('saveIncomeBtn');
  if(btn.disabled) return;
  const amount=parseFloat(document.getElementById('incomeAmount').value);
  const date=document.getElementById('incomeDate').value;
  if(!amount||amount<=0)return toast('Enter a valid amount','error');
  if(!date)return toast('Select a date','error');
  setLoading(btn,true,'Saving...');
  const rec={user_id:currentUser.id,platform:document.getElementById('incomePlatform').value,amount,tips:parseFloat(document.getElementById('incomeTips').value)||0,hours:parseFloat(document.getElementById('incomeHours').value)||null,miles:parseFloat(document.getElementById('incomeMiles').value)||null,date,notes:document.getElementById('incomeNotes').value.trim()};
  const {error}=editingId?await db.from('gp_income').update(rec).eq('id',editingId):await db.from('gp_income').insert(rec);
  setLoading(btn,false,'Save');
  if(error){toast('Error: '+error.message,'error');return;}
  toast(editingId?'Updated!':'Saved!','success');closeModal('incomeModal');loadEarnings();loadHome();
}

// ── EXPENSE CRUD ─────────────────────────────
function showAddExpense(){
  editingId=null;document.getElementById('expenseModalTitle').textContent='Add Expense';
  document.getElementById('expenseDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('expenseCategory').value='Gas';
  ['expenseAmount','expenseNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('expenseDeductible').checked=true;document.getElementById('expenseModal').classList.add('active');
}
async function editExpense(id){
  const {data}=await db.from('gp_expenses').select('*').eq('id',id).single();if(!data)return;
  editingId=id;document.getElementById('expenseModalTitle').textContent='Edit Expense';
  document.getElementById('expenseCategory').value=data.category;document.getElementById('expenseAmount').value=data.amount;
  document.getElementById('expenseDate').value=data.date;document.getElementById('expenseNotes').value=data.notes||'';
  document.getElementById('expenseDeductible').checked=data.is_deductible;document.getElementById('expenseModal').classList.add('active');
}
async function deleteExpense(id){
  if(!confirm('Delete this expense?'))return;
  await db.from('gp_expenses').delete().eq('id',id);
  toast('Deleted','success');loadExpenses();loadHome();
}
async function saveExpense(){
  const btn=document.getElementById('saveExpenseBtn');
  if(btn.disabled) return;
  const amount=parseFloat(document.getElementById('expenseAmount').value);
  const date=document.getElementById('expenseDate').value;
  if(!amount||amount<=0)return toast('Enter a valid amount','error');
  setLoading(btn,true,'Saving...');
  const rec={user_id:currentUser.id,category:document.getElementById('expenseCategory').value,amount,date,notes:document.getElementById('expenseNotes').value.trim(),is_deductible:document.getElementById('expenseDeductible').checked};
  const {error}=editingId?await db.from('gp_expenses').update(rec).eq('id',editingId):await db.from('gp_expenses').insert(rec);
  setLoading(btn,false,'Save');
  if(error){toast('Error: '+error.message,'error');return;}
  toast(editingId?'Updated!':'Saved!','success');closeModal('expenseModal');loadExpenses();loadHome();
}

// ── REPORTS ──────────────────────────────────
function initReportMonths(){
  const sel=document.getElementById('reportMonth');if(!sel)return;
  const now=new Date();const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const opt=document.createElement('option');
    opt.value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    opt.textContent=`${months[d.getMonth()]} ${d.getFullYear()}`;
    if(i===0)opt.selected=true;sel.appendChild(opt);
  }
}
async function loadReports(){
  if(!currentUser)return;
  const sel=document.getElementById('reportMonth');
  const [year,month]=(sel?.value||new Date().toISOString().slice(0,7)).split('-').map(Number);
  const start=`${year}-${String(month).padStart(2,'0')}-01`;
  const end=new Date(year,month,0).toISOString().split('T')[0];
  const [{data:inc},{data:exp}]=await Promise.all([
    db.from('gp_income').select('*').eq('user_id',currentUser.id).gte('date',start).lte('date',end),
    db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',start).lte('date',end),
  ]);
  const gross=sumF(inc,'amount')+sumF(inc,'tips');
  const expenses=sumF(exp,'amount');
  const miles=sumF(inc,'miles');const mileDeduct=miles*0.70;
  const txRate=userProfile?.country==='CA'?0.28:0.153;
  const tax=Math.max(0,gross-expenses)*0.9235*txRate;
  const net=gross-expenses-tax;
  setText('roNet',fmt(net));setText('roEarn',fmt(gross));setText('roExp',fmt(expenses));setText('roTax',fmt(tax));setText('roMiles',fmt(mileDeduct));
  loadQuarterlyTax(year,txRate);
}
async function loadQuarterlyTax(year,txRate){
  const yr=year||new Date().getFullYear();const tr=txRate||(userProfile?.country==='CA'?0.28:0.153);
  const currentQ=Math.floor(new Date().getMonth()/3)+1;
  setText('taxYearLabel',yr+' QUARTERLY TAX');
  const quarters=[
    {q:1,label:'Q1',months:'Jan – Mar',start:`${yr}-01-01`,end:`${yr}-03-31`,due:`Apr 15, ${yr}`},
    {q:2,label:'Q2',months:'Apr – Jun',start:`${yr}-04-01`,end:`${yr}-06-30`,due:`Jun 16, ${yr}`},
    {q:3,label:'Q3',months:'Jul – Sep',start:`${yr}-07-01`,end:`${yr}-09-30`,due:`Sep 15, ${yr}`},
    {q:4,label:'Q4',months:'Oct – Dec',start:`${yr}-10-01`,end:`${yr}-12-31`,due:`Jan 15, ${yr+1}`},
  ];
  const [{data:inc},{data:exp}]=await Promise.all([
    db.from('gp_income').select('*').eq('user_id',currentUser.id).gte('date',`${yr}-01-01`),
    db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',`${yr}-01-01`),
  ]);
  const html=quarters.map(({q,label,months,start,end,due})=>{
    const qi=(inc||[]).filter(r=>r.date>=start&&r.date<=end);
    const qe=(exp||[]).filter(r=>r.date>=start&&r.date<=end);
    const gross=sumF(qi,'amount')+sumF(qi,'tips');const expenses=sumF(qe,'amount');
    const miles=sumF(qi,'miles')*0.70;const net=Math.max(0,gross-expenses-miles);const tax=net*0.9235*tr;
    const s=q<currentQ?'past':q===currentQ?'current':'future';
    const badge=q<currentQ?'✅ Past':q===currentQ?'⚡ Current':'🔜 Upcoming';
    return `<div class="q-card ${s==='current'?'active-q':''}">
      <div class="q-head"><div><div class="q-title">${label}</div><div class="q-months">${months}</div></div><div class="q-badge ${s}">${badge}</div></div>
      <div class="q-rows">
        <div class="q-row"><span>Gross Income</span><span class="positive">${fmt(gross)}</span></div>
        <div class="q-row"><span>Expenses</span><span class="negative">−${fmt(expenses)}</span></div>
        <div class="q-row"><span>Mileage Deduction</span><span class="negative">−${fmt(miles)}</span></div>
        <div class="q-row"><span>Net Profit</span><span>${fmt(net)}</span></div>
      </div>
      <div class="q-tax"><span class="q-tax-label">Est. Tax Due</span><span class="q-tax-amt">${fmt(tax)}</span></div>
      <div class="q-due">📅 Due: ${due}</div>
      ${s==='current'?`<div style="margin-top:10px;padding:8px 12px;background:rgba(30,216,164,0.06);border-radius:9px;font-size:0.78rem;color:#1ed8a4">💡 Set aside ${fmt(tax)} by ${due}</div>`:''}
    </div>`;
  }).join('');
  document.getElementById('quarterCards').innerHTML=html;
}
function scrollToQuarters(){document.getElementById('quarterCards').scrollIntoView({behavior:'smooth'});}

// ── PROFILE ──────────────────────────────────
async function loadProfilePage(){
  if(!userProfile)return;
  const name=userProfile.full_name||'Driver';
  const email=currentUser.email;
  const masked=email.split('@')[0].slice(0,4)+'****@'+email.split('@')[1];
  setText('profileName',name);
  // Email now shown in Account section
  const emailEl=document.getElementById('profileEmail');
  if(emailEl)emailEl.textContent=masked;
  setText('siGoal',fmtShort(userProfile.monthly_goal||0));
  setText('siCurrency',userProfile.currency||'USD');
  const pp=document.getElementById('profilePlatforms');
  const plats=userProfile.platforms||[];
  if(pp) pp.innerHTML=plats.length===0?'<div style="padding:12px 16px;color:var(--text3);font-size:0.85rem">No platforms set</div>':plats.map(p=>`<div class="plat-chip2">${p}</div>`).join('');
}

// ── EXPORT ───────────────────────────────────
function showExportModal(){
  const now=new Date();const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('exportFrom').value=`${y}-${m}-01`;
  document.getElementById('exportTo').value=now.toISOString().split('T')[0];
  document.getElementById('exportModal').classList.add('active');
}
function setRange(r,btn){
  document.querySelectorAll('.range-chip').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const now=new Date();const y=now.getFullYear(),m=now.getMonth();
  let from,to=now;
  if(r==='this-month')from=new Date(y,m,1);
  else if(r==='last-month'){from=new Date(y,m-1,1);to=new Date(y,m,0);}
  else if(r==='this-quarter'){const q=Math.floor(m/3);from=new Date(y,q*3,1);}
  else if(r==='this-year')from=new Date(y,0,1);
  else if(r==='all-time')from=new Date(2020,0,1);
  document.getElementById('exportFrom').value=from.toISOString().split('T')[0];
  document.getElementById('exportTo').value=to.toISOString().split('T')[0];
}
async function runExport(){
  const from=document.getElementById('exportFrom').value;const to=document.getElementById('exportTo').value;
  const dataType=document.querySelector('input[name="expData"]:checked')?.value||'all';
  let fmt2=document.querySelector('input[name="expFmt"]:checked')?.value||'pdf';
  const btn=document.getElementById('runExportBtn');
  if(!from||!to)return toast('Select a date range','error');
  setLoading(btn,true,'Preparing...');
  let inc=[],exp=[];
  if(dataType!=='expenses'){const {data}=await db.from('gp_income').select('*').eq('user_id',currentUser.id).gte('date',from).lte('date',to).order('date',{ascending:false});inc=data||[];}
  if(dataType!=='income'){const {data}=await db.from('gp_expenses').select('*').eq('user_id',currentUser.id).gte('date',from).lte('date',to).order('date',{ascending:false});exp=data||[];}
  setLoading(btn,false,'Export');
  if(inc.length===0&&exp.length===0){toast('No data found','error');return;}
  closeModal('exportModal');
  const label=from+' to '+to;
  fmt2==='csv'?exportCSV(inc,exp,label):exportPDF(inc,exp,label);
}
function exportCSV(income,expenses,label){
  const csv=[
    [`GIGPROFIT EXPORT — ${label}`],[],
    ['=== INCOME ==='],['Date','Platform','Earnings','Tips','Total','Hours','Miles','Notes'],
    ...income.map(r=>[r.date,r.platform,r.amount,r.tips||0,(parseFloat(r.amount)+parseFloat(r.tips||0)).toFixed(2),r.hours||'',r.miles||'',r.notes||'']),
    [],[' === EXPENSES ==='],['Date','Category','Amount','Deductible','Notes'],
    ...expenses.map(r=>[r.date,r.category,r.amount,r.is_deductible?'Yes':'No',r.notes||'']),
    [],['=== SUMMARY ==='],
    ['Total Income',(sumF(income,'amount')+sumF(income,'tips')).toFixed(2)],
    ['Total Expenses',sumF(expenses,'amount').toFixed(2)],
  ].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='GigProfit-Export.csv';a.click();toast('CSV downloaded!','success');
}
function exportPDF(income,expenses,label){
  const totalInc=sumF(income,'amount')+sumF(income,'tips');const totalExp=sumF(expenses,'amount');
  const miles=sumF(income,'miles');const txRate=userProfile?.country==='CA'?0.28:0.153;
  const tax=Math.max(0,totalInc-totalExp)*0.9235*txRate;const net=totalInc-totalExp-tax;
  // Remove existing PDF modal if any
  document.getElementById('pdfModal')?.remove();
  const modal=document.createElement('div');
  modal.id='pdfModal';
  modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;overflow:hidden';
  // Inject print styles
  const printStyle=document.createElement('style');
  printStyle.id='pdfPrintStyle';
  printStyle.textContent=`@media print{body{background:white!important;}#pdfModal{background:white!important;position:static!important;display:block!important;}#pdfModalHeader{display:none!important;}#pdfContent{overflow:visible!important;padding:16px!important;height:auto!important;min-height:unset!important;}body>*:not(#pdfModal){display:none!important;}}`;
  document.head.appendChild(printStyle);
  modal.innerHTML=`
    <div id="pdfModalHeader" style="display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top, 12px) + 12px) 16px 12px;background:#111;flex-shrink:0">
      <span style="color:#1ed8a4;font-weight:700;font-size:1rem">Tax Report</span>
      <div style="display:flex;gap:10px">
        <button onclick="window.print()" style="background:#1ed8a4;color:#000;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:0.85rem;cursor:pointer">🖨 Print / Save</button>
        <button onclick="document.getElementById('pdfModal').remove();document.getElementById('pdfPrintStyle')?.remove();" style="background:rgba(255,255,255,0.1);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;font-size:0.85rem;cursor:pointer">✕ Close</button>
      </div>
    </div>
    <div id="pdfContent" style="flex:1;overflow-y:auto;background:#fff;padding:32px;font-family:Arial,sans-serif;color:#1a1a1a;font-size:12px">
      <div style="font-size:20px;font-weight:800;color:#1ed8a4">GigProfit</div>
      <div style="color:#888;font-size:11px;margin-bottom:20px">Tax Report · ${label} · Generated ${new Date().toLocaleDateString()}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0">
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #1ed8a4"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Total Income</div><div style="font-size:16px;font-weight:800;color:#1ed8a4">${fmt(totalInc)}</div></div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #f16c6c"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Total Expenses</div><div style="font-size:16px;font-weight:800;color:#f16c6c">${fmt(totalExp)}</div></div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #e8a838"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Est. Tax</div><div style="font-size:16px;font-weight:800;color:#e8a838">${fmt(tax)}</div></div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #4a90d9"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Net Profit</div><div style="font-size:16px;font-weight:800">${fmt(net)}</div></div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #4a90d9"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Total Miles</div><div style="font-size:16px;font-weight:800">${miles.toFixed(1)} mi</div></div>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;border-left:4px solid #8b5cf6"><div style="font-size:10px;text-transform:uppercase;color:#888;margin-bottom:4px">Mileage Deduction</div><div style="font-size:16px;font-weight:800">${fmt(miles*0.70)}</div></div>
      </div>
      <h3 style="margin:20px 0 8px">Income (${income.length} entries)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#f0f0f0"><th style="padding:8px;text-align:left">Date</th><th style="padding:8px;text-align:left">Platform</th><th style="padding:8px;text-align:left">Amount</th><th style="padding:8px;text-align:left">Tips</th><th style="padding:8px;text-align:left">Miles</th></tr>${income.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.date}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.platform}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">$${parseFloat(r.amount).toFixed(2)}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">$${parseFloat(r.tips||0).toFixed(2)}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.miles||0}</td></tr>`).join('')}</table>
      <h3 style="margin:20px 0 8px">Expenses (${expenses.length} entries)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#f0f0f0"><th style="padding:8px;text-align:left">Date</th><th style="padding:8px;text-align:left">Category</th><th style="padding:8px;text-align:left">Amount</th><th style="padding:8px;text-align:left">Deductible</th></tr>${expenses.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.date}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.category}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">$${parseFloat(r.amount).toFixed(2)}</td><td style="padding:7px;border-bottom:1px solid #f0f0f0">${r.is_deductible?'Yes':'No'}</td></tr>`).join('')}</table>
      <div style="background:#fff8e6;border:1px solid #ffd980;border-radius:6px;padding:10px;font-size:10px;color:#7a5c00;margin-top:20px">⚠️ This report is for informational purposes only and does not constitute tax advice.</div>
    </div>`;
  document.body.appendChild(modal);
  toast('Report ready — Print or Save as PDF','success');
}

// ── CHARTS ───────────────────────────────────
function setupCanvas(canvas,h){
  const dpr=Math.min(window.devicePixelRatio||1,3);
  const w=Math.max((canvas.parentElement?.clientWidth||360)-28,200);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  return{ctx,W:w,H:h};
}

function drawBarChart(canvasId,inc,period,start,color){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  const{ctx,W,H}=setupCanvas(canvas,160);
  const padL=8,padR=8,padT=16,padB=24,cW=W-padL-padR,cH=H-padT-padB;
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  const textClr=isDark?'rgba(255,255,255,0.3)':'rgba(0,0,0,0.3)';
  const gridClr=isDark?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)';

  const labels=[],data=[];
  if(period==='week'){
    const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const startD=new Date(start+'T00:00:00');
    for(let i=0;i<7;i++){const d=new Date(startD);d.setDate(d.getDate()+i);labels.push(days[d.getDay()]);data.push(0);}
    inc.forEach(r=>{const d=new Date(r.date+'T00:00:00');const i=Math.round((d-startD)/86400000);if(i>=0&&i<7)data[i]+=parseFloat(r.amount)+parseFloat(r.tips||0);});
  }else if(period==='month'){
    const now=new Date();const dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    for(let d=1;d<=dim;d+=3){labels.push(d+'');data.push(0);}
    inc.forEach(r=>{const day=parseInt(r.date.split('-')[2]);const i=Math.floor((day-1)/3);if(i<data.length)data[i]+=parseFloat(r.amount)+parseFloat(r.tips||0);});
  }else if(period==='year'){
    ['J','F','M','A','M','J','J','A','S','O','N','D'].forEach(m=>{labels.push(m);data.push(0);});
    inc.forEach(r=>{const m=parseInt(r.date.split('-')[1])-1;data[m]+=parseFloat(r.amount)+parseFloat(r.tips||0);});
  }else{
    // Day — show by platform or single empty bar
    const byPlat={};
    inc.forEach(r=>{byPlat[r.platform]=(byPlat[r.platform]||0)+parseFloat(r.amount)+parseFloat(r.tips||0);});
    const entries=Object.entries(byPlat).sort((a,b)=>b[1]-a[1]).slice(0,6);
    if(entries.length===0){
      ['6a','9a','12p','3p','6p','9p'].forEach(h=>{labels.push(h);data.push(0);});
    }else{
      entries.forEach(([p,v])=>{
        labels.push(p.length>6?p.slice(0,6):p);
        data.push(v);
      });
    }
  }

  const maxV=Math.max(...data,1);
  const n=labels.length;const bW=Math.max(cW/n*0.5,4);const bGap=cW/n;

  // Grid
  for(let i=0;i<=3;i++){
    const y=padT+(cH/3)*i;
    ctx.strokeStyle=gridClr;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
  }

  // Bars
  data.forEach((val,i)=>{
    const x=padL+bGap*i+(bGap-bW)/2;
    const bh=Math.max((val/maxV)*cH,val>0?3:0);
    const grad=ctx.createLinearGradient(0,padT+cH-bh,0,padT+cH);
    grad.addColorStop(0,color);grad.addColorStop(1,color+'25');
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.roundRect(x,padT+cH-bh,bW,Math.max(bh,1),3);ctx.fill();
    const fontSize=Math.min(11,Math.max(8,Math.floor(cW/n*0.45)));
    ctx.fillStyle=textClr;ctx.font=`${fontSize}px Inter,sans-serif`;ctx.textAlign='center';
    ctx.fillText(labels[i],x+bW/2,H-5);
  });
}

function drawDonut(canvasId,expenses){
  const canvas=document.getElementById(canvasId);if(!canvas)return;
  const{ctx,W,H}=setupCanvas(canvas,160);
  const isDark=document.documentElement.getAttribute('data-theme')!=='light';
  const cx=W*0.35,cy=H/2,R=Math.min(cx,cy)*0.85,r=R*0.56;
  const byC={};expenses.forEach(e=>{byC[e.category]=(byC[e.category]||0)+parseFloat(e.amount);});
  const entries=Object.entries(byC).sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((s,[,v])=>s+v,0);
  const colors=['#f16c6c','#e8a838','#fb923c','#f472b6','#8b5cf6','#60a5fa','#34d399'];
  ctx.clearRect(0,0,W,H);
  if(total===0){ctx.fillStyle=isDark?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.2)';ctx.font='12px Inter,sans-serif';ctx.textAlign='center';ctx.fillText('No expenses',cx,cy);return;}
  let angle=-Math.PI/2;
  entries.forEach(([,val],i)=>{const sl=(val/total)*Math.PI*2;ctx.fillStyle=colors[i%colors.length];ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,angle,angle+sl);ctx.closePath();ctx.fill();angle+=sl;});
  ctx.fillStyle=isDark?'#0b1220':'#ffffff';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#f16c6c';ctx.font='bold 12px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(fmt(total),cx,cy-3);
  ctx.fillStyle=isDark?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.35)';ctx.font='9px Inter,sans-serif';ctx.fillText('total',cx,cy+11);
  const lx=W*0.68,ly0=cy-(Math.min(entries.length,5)*19)/2;
  entries.slice(0,5).forEach(([cat,val],i)=>{
    const y=ly0+i*20;ctx.fillStyle=colors[i%colors.length];ctx.fillRect(lx-18,y-6,8,8);
    ctx.fillStyle=isDark?'rgba(255,255,255,0.75)':'rgba(0,0,0,0.7)';ctx.font='9px Inter,sans-serif';ctx.textAlign='left';
    ctx.fillText(cat.length>9?cat.slice(0,9)+'…':cat,lx-7,y+3);
    ctx.fillStyle=isDark?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.35)';
    ctx.fillText(Math.round((val/total)*100)+'%',lx-7,y+13);
  });
}

// ── ICON HELPERS ─────────────────────────────
function getPlatformClass(p){
  const m={'Uber':'uber','Lyft':'lyft','DoorDash':'doordash','Amazon Flex':'amazon','Spark':'spark'};
  return m[p]||'income-generic';
}
function platformSvg(p){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
}
function expSvg(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;}
function editSvg(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;}
function delSvg(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;}

// ── UTILS ────────────────────────────────────
function getRange(period){
  const now=new Date(),today=now.toISOString().split('T')[0];
  if(period==='today'||period==='day')return{start:today,end:today};
  if(period==='week'){const day=now.getDay(),mon=new Date(now);mon.setDate(now.getDate()-day+(day===0?-6:1));return{start:mon.toISOString().split('T')[0],end:today};}
  if(period==='month')return{start:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,end:today};
  if(period==='year')return{start:`${now.getFullYear()}-01-01`,end:today};
  return{start:today,end:today};
}
function sumF(arr,f){return(arr||[]).reduce((s,r)=>s+parseFloat(r[f]||0),0);}
function fmt(n){const v=parseFloat(n)||0;return(v<0?'-$':'$')+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmtShort(n){const raw=parseFloat(n)||0;const v=Math.abs(raw);const sign=raw<0?'-':'';if(v>=1000)return sign+'$'+(v/1000).toFixed(1)+'k';return sign+'$'+v.toFixed(0);}
function formatDate(d){if(!d)return'';return new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function formatDateLong(d){if(!d)return'';return new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
function formatDateShort(d){if(!d)return'';const now=new Date().toISOString().split('T')[0];if(d===now)return'Today';return formatDate(d);}
function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function closeModal(id){document.getElementById(id)?.classList.remove('active');editingId=null;}
function setLoading(btn,loading,text){if(!btn)return;btn.disabled=loading;btn.textContent=text;}
function toast(msg,type='success'){
  document.querySelector('.toast')?.remove();
  const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},3000);
}

// ── PROFILE EDIT ─────────────────────────────
function editGoal() {
  document.getElementById('goalInput').value = userProfile?.monthly_goal || '';
  document.getElementById('goalModal').classList.add('active');
}

async function saveGoal() {
  const val = parseFloat(document.getElementById('goalInput').value);
  if (isNaN(val) || val < 0) return toast('Enter a valid amount', 'error');
  const { error } = await db.from('profiles').update({ monthly_goal: val }).eq('user_id', currentUser.id);
  if (error) { toast('Error saving', 'error'); return; }
  userProfile.monthly_goal = val;
  setText('siGoal', fmtShort(val));
  closeModal('goalModal');
  toast('Goal updated!', 'success');
}

function editCurrency() {
  document.getElementById('currencyInput').value = userProfile?.currency || 'USD';
  document.getElementById('currencyModal').classList.add('active');
}

async function saveCurrency() {
  const val = document.getElementById('currencyInput').value;
  const { error } = await db.from('profiles').update({ currency: val }).eq('user_id', currentUser.id);
  if (error) { toast('Error saving', 'error'); return; }
  userProfile.currency = val;
  setText('siCurrency', val);
  closeModal('currencyModal');
  toast('Currency updated!', 'success');
}

// ── DELETE ACCOUNT ───────────────────────────
function showDeleteAccount(){
  document.getElementById('deleteConfirmInput').value='';
  document.getElementById('deleteAccountModal').classList.add('active');
}

async function deleteAccount(){
  const input=document.getElementById('deleteConfirmInput').value.trim();
  if(input!=='DELETE') return toast('Type DELETE to confirm','error');
  
  const btn=document.querySelector('#deleteAccountModal .btn-primary');
  setLoading(btn,true,'Deleting...');
  
  try{
    // Delete all user data first
    await db.from('gp_income').delete().eq('user_id',currentUser.id);
    await db.from('gp_expenses').delete().eq('user_id',currentUser.id);
    await db.from('profiles').delete().eq('user_id',currentUser.id);
    
    // Delete the auth user via Supabase
    const {error}=await db.rpc('delete_user');
    
    if(error){
      // Fallback: just sign out and show message
      await db.auth.signOut();
      toast('Data deleted. Contact support to remove auth account.','success');
      return;
    }
    
    await db.auth.signOut();
    toast('Account deleted successfully','success');
  }catch(e){
    // Even if RPC fails, data is deleted — sign out
    await db.auth.signOut();
    toast('Account data deleted','success');
  }
  setLoading(btn,false,'Delete My Account');
  closeModal('deleteAccountModal');
}
