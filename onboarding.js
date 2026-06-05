// ============================
// GIGPROFIT — ONBOARDING
// ============================

let obData = {
  platforms: [],
  country: 'US',
  currency: 'USD',
  taxStatus: 'single',
  monthlyGoal: 3000,
};

function initOnboarding() {
  obData = { platforms: [], country: 'US', currency: 'USD', taxStatus: 'single', monthlyGoal: 3000 };
  showObStep(1);
  updateObProgress(1);

  // Platform button click handlers
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.platform;
      btn.classList.toggle('selected');
      if (obData.platforms.includes(p)) {
        obData.platforms = obData.platforms.filter(x => x !== p);
      } else {
        obData.platforms.push(p);
      }
    });
  });

  // Set today's date in income/expense forms
  const today = todayISO();
  ['income-date', 'expense-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

function showObStep(n) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.add('hidden'));
  const step = document.getElementById(`ob-step-${n}`);
  if (step) step.classList.remove('hidden');
}

function updateObProgress(step) {
  const total = 4;
  const pct = ((step - 1) / total) * 100;
  document.getElementById('ob-progress').style.width = `${pct}%`;
  document.getElementById('ob-step-label').textContent = `Step ${step} of ${total}`;
}

function obNext(step) {
  if (step === 1) {
    if (obData.platforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }
    showObStep(2);
    updateObProgress(2);
  } else if (step === 2) {
    if (!obData.country) {
      showToast('Please select your country', 'error');
      return;
    }
    showObStep(3);
    updateObProgress(3);
  } else if (step === 3) {
    if (!obData.taxStatus) {
      showToast('Please select your filing status', 'error');
      return;
    }
    showObStep(4);
    updateObProgress(4);
    // Update goal symbol
    const sym = obData.currency === 'CAD' ? 'CA$' : '$';
    document.getElementById('goal-symbol').textContent = sym;
  }
}

function selectCountry(btn) {
  document.querySelectorAll('[data-country]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  obData.country = btn.dataset.country;
  obData.currency = btn.dataset.currency;
}

function selectOption(btn, type) {
  const parent = btn.parentElement;
  parent.querySelectorAll('.ob-option-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  if (type === 'tax') obData.taxStatus = btn.dataset.tax;
}

async function obFinish() {
  const goalInput = document.getElementById('monthly-goal').value;
  obData.monthlyGoal = parseFloat(goalInput) || 3000;

  const btn = document.querySelector('#ob-step-4 .ob-next');
  btn.disabled = true;
  btn.textContent = 'Setting up…';

  const error = await saveProfile({
    platforms: obData.platforms,
    country: obData.country,
    currency: obData.currency,
    tax_status: obData.taxStatus,
    monthly_goal: obData.monthlyGoal,
    onboarding_done: true,
  });

  btn.disabled = false;
  btn.textContent = 'Start Tracking 🚀';

  if (error) {
    showToast('Error saving profile. Try again.', 'error');
    return;
  }

  // Populate income platform dropdown with user's platforms
  populatePlatformDropdown();
  launchApp();
}

function populatePlatformDropdown() {
  const select = document.getElementById('income-platform');
  if (!select) return;
  const platforms = userProfile?.platforms || [];
  select.innerHTML = '<option value="">Select platform…</option>';
  platforms.forEach(p => {
    const info = PLATFORM_LABELS[p] || { label: p, emoji: '🔧' };
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = `${info.emoji} ${info.label}`;
    select.appendChild(opt);
  });
  // Always add "Other"
  if (!platforms.includes('other')) {
    const opt = document.createElement('option');
    opt.value = 'other';
    opt.textContent = '🔧 Other';
    select.appendChild(opt);
  }
}
