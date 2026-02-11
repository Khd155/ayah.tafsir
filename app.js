/* ========================================
   Competition Dashboard - Main JavaScript
   ======================================== */

// ============ Configuration ============
const APP_CONFIG = {
  defaultPassword: 'admin123',
  statsRefreshInterval: 60000, // 60 seconds
  toastDuration: 4000,
  version: '1.0.0'
};

// ============ State Management ============
const AppState = {
  currentUser: null,
  currentPage: 'control',
  statsInterval: null,
  countdownInterval: null,
  countdownValue: 60,
  activityLog: [],
  chartInstance: null
};

// ============ Storage Helpers ============
const Storage = {
  get(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ============ Script URL Management ============
function getScriptURL() {
  return Storage.get('scriptURL', '');
}

function setScriptURL(url) {
  Storage.set('scriptURL', url);
}

// ============ User Management ============
function getUsers() {
  const defaultUsers = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() }
  ];
  return Storage.get('users', defaultUsers);
}

function saveUsers(users) {
  Storage.set('users', users);
}

function addUser(username, password, role) {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    showToast('اسم المستخدم موجود مسبقاً', 'error');
    return false;
  }
  const newUser = {
    id: Date.now(),
    username,
    password,
    role,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  showToast('تم إضافة المستخدم بنجاح', 'success');
  return true;
}

function deleteUser(id) {
  let users = getUsers();
  const user = users.find(u => u.id === id);
  if (user && user.username === 'admin') {
    showToast('لا يمكن حذف حساب المدير الرئيسي', 'error');
    return;
  }
  users = users.filter(u => u.id !== id);
  saveUsers(users);
  showToast('تم حذف المستخدم بنجاح', 'success');
  renderUsersTable();
}

function updateUserRole(id, newRole) {
  const users = getUsers();
  const user = users.find(u => u.id === id);
  if (user) {
    if (user.username === 'admin') {
      showToast('لا يمكن تغيير صلاحيات المدير الرئيسي', 'error');
      return;
    }
    user.role = newRole;
    saveUsers(users);
    showToast('تم تحديث الصلاحيات بنجاح', 'success');
    renderUsersTable();
  }
}

// ============ Authentication ============
function login() {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorEl = document.getElementById('loginError');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (!username || !password) {
    errorEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
    errorEl.style.display = 'block';
    return;
  }
  
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    AppState.currentUser = user;
    Storage.set('currentSession', { username: user.username, role: user.role });
    errorEl.style.display = 'none';
    showDashboard();
    showToast(`مرحباً ${user.username}`, 'success');
    addActivityLog('تسجيل دخول', true);
  } else {
    errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    errorEl.style.display = 'block';
    shakeElement(document.querySelector('.login-box'));
  }
}

function logout() {
  AppState.currentUser = null;
  Storage.remove('currentSession');
  stopAutoRefresh();
  document.getElementById('loginContainer').style.display = 'flex';
  document.getElementById('dashboardContainer').style.display = 'none';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginUsername').value = '';
  showToast('تم تسجيل الخروج', 'info');
}

function checkSession() {
  const session = Storage.get('currentSession');
  if (session) {
    const users = getUsers();
    const user = users.find(u => u.username === session.username);
    if (user) {
      AppState.currentUser = user;
      showDashboard();
      return;
    }
  }
  document.getElementById('loginContainer').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('dashboardContainer').style.display = 'block';
  
  // Update user info
  const avatarEl = document.getElementById('userAvatar');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  
  if (AppState.currentUser) {
    avatarEl.textContent = AppState.currentUser.username.charAt(0).toUpperCase();
    nameEl.textContent = AppState.currentUser.username;
    roleEl.textContent = AppState.currentUser.role === 'admin' ? 'مدير' : 'مشاهد';
  }
  
  // Apply role restrictions
  applyRoleRestrictions();
  
  // Navigate to control page
  navigateTo('control');
  
  // Check script URL
  checkScriptURLStatus();
}

function applyRoleRestrictions() {
  const isViewer = AppState.currentUser && AppState.currentUser.role === 'viewer';
  const controlBtns = document.querySelectorAll('.control-btn[data-action]');
  
  controlBtns.forEach(btn => {
    const action = btn.getAttribute('data-action');
    // Viewers can only view stats and results
    if (isViewer && !['stats', 'results1', 'results3'].includes(action)) {
      btn.classList.add('disabled');
    } else {
      btn.classList.remove('disabled');
    }
  });
  
  // Hide users nav for viewers
  const usersNav = document.getElementById('navUsers');
  if (usersNav) {
    usersNav.style.display = isViewer ? 'none' : 'flex';
  }
}

// ============ Navigation ============
function navigateTo(page) {
  AppState.currentPage = page;
  
  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === page);
  });
  
  // Show/hide pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
  }
  
  // Page-specific actions
  if (page === 'stats') {
    loadStats();
    startAutoRefresh();
  } else if (page !== 'stats') {
    stopAutoRefresh();
  }
  
  if (page === 'users') {
    renderUsersTable();
  }
  
  if (page === 'settings') {
    loadSettings();
  }
  
  // Close mobile sidebar
  closeSidebar();
}

// ============ Sidebar Toggle (Mobile) ============
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

// ============ API Communication ============
async function sendAction(action, btn = null) {
  const scriptURL = getScriptURL();
  
  if (!scriptURL) {
    showToast('يرجى إعداد رابط Google Apps Script أولاً', 'warning');
    return null;
  }
  
  // Set loading state
  if (btn) {
    btn.classList.add('loading');
    const icon = btn.querySelector('i');
    if (icon) {
      icon._originalClass = icon.className;
      icon.className = 'fas fa-spinner';
    }
  }
  
  try {
    const response = await fetch(scriptURL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (action !== 'stats') {
        showToast(getActionMessage(action), 'success');
      }
      addActivityLog(getActionLabel(action), true);
      
      // Handle results display
      if (action === 'results1' || action === 'results3') {
        showResults(data);
      }
      
      return data;
    } else {
      showToast(data.message || 'حدث خطأ أثناء التنفيذ', 'error');
      addActivityLog(getActionLabel(action) + ' - فشل', false);
      return null;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('فشل الاتصال بالسكربت. تحقق من الرابط والاتصال.', 'error');
    addActivityLog(getActionLabel(action) + ' - خطأ اتصال', false);
    return null;
  } finally {
    // Remove loading state
    if (btn) {
      btn.classList.remove('loading');
      const icon = btn.querySelector('i');
      if (icon && icon._originalClass) {
        icon.className = icon._originalClass;
      }
    }
  }
}

function getActionMessage(action) {
  const messages = {
    openForm: 'تم فتح النموذج بنجاح',
    closeForm: 'تم إغلاق النموذج بنجاح',
    update: 'تم تحديث السؤال بنجاح',
    update_open: 'تم التحديث والفتح بنجاح',
    delete: 'تم حذف الردود بنجاح',
    backup: 'تم النسخ الاحتياطي بنجاح',
    results1: 'تم جلب نتائج آخر سؤال',
    results3: 'تم جلب نتائج آخر 3 أسئلة',
    stats: 'تم تحديث الإحصائيات'
  };
  return messages[action] || 'تم التنفيذ بنجاح';
}

function getActionLabel(action) {
  const labels = {
    openForm: 'فتح النموذج',
    closeForm: 'إغلاق النموذج',
    update: 'تحديث السؤال',
    update_open: 'تحديث وفتح',
    delete: 'حذف الردود',
    backup: 'نسخ احتياطي',
    results1: 'نتائج آخر سؤال',
    results3: 'نتائج آخر 3 أسئلة',
    stats: 'إحصائيات'
  };
  return labels[action] || action;
}

// ============ Control Panel Actions ============
function handleControlAction(action, btnElement) {
  // Confirmation for dangerous actions
  if (action === 'delete') {
    if (!confirm('هل أنت متأكد من حذف جميع الردود؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      return;
    }
  }
  
  sendAction(action, btnElement);
}

// ============ Results Display ============
function showResults(data) {
  const resultsDiv = document.getElementById('resultsDisplay');
  const resultsContent = document.getElementById('resultsContent');
  
  if (resultsDiv && resultsContent) {
    resultsDiv.classList.add('show');
    
    // Format the data nicely
    let displayData = { ...data };
    delete displayData.success;
    
    resultsContent.textContent = JSON.stringify(displayData, null, 2);
  }
}

function hideResults() {
  const resultsDiv = document.getElementById('resultsDisplay');
  if (resultsDiv) {
    resultsDiv.classList.remove('show');
  }
}

// ============ Statistics ============

// Convert number to Arabic-Indic numerals
function toArabicNum(num) {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, d => arabicDigits[parseInt(d)]);
}

// Format date in Arabic Egyptian style
function formatArabicDate(dateStr) {
  if (!dateStr) return 'لا يوجد';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

async function loadStats() {
  const scriptURL = getScriptURL();
  const refreshBtn = document.getElementById('refreshNowBtn');
  
  if (!scriptURL) {
    updateStatsUI({
      totalResponses: 0,
      todayResponses: 0,
      lastResponse: null,
      correctAnswers: 0,
      lastQuestion: null,
      totalAnswersOnLastQ: 0,
      wrongAnswers: 0
    });
    updateChart({ totalResponses: 0, todayResponses: 0 });
    showToast('يرجى إعداد رابط Google Apps Script في الإعدادات', 'warning');
    return;
  }
  
  // Add loading animation to refresh button
  if (refreshBtn) refreshBtn.classList.add('loading');
  
  const data = await sendAction('stats');
  
  if (refreshBtn) refreshBtn.classList.remove('loading');
  
  if (data) {
    updateStatsUI(data);
    updateChart(data);
    updateLastQuestionCard(data);
  }
  
  // Reset countdown
  resetCountdown();
}

function updateStatsUI(data) {
  const totalEl = document.getElementById('statTotal');
  const todayEl = document.getElementById('statToday');
  const lastEl = document.getElementById('statLast');
  const correctEl = document.getElementById('statCorrect');
  
  const total = data.totalResponses || 0;
  const today = data.todayResponses || 0;
  const correct = data.correctAnswers || 0;
  const totalOnLastQ = data.totalAnswersOnLastQ || 0;
  
  // Animate numbers with Arabic numerals
  if (totalEl) animateNumberArabic(totalEl, total);
  if (todayEl) animateNumberArabic(todayEl, today);
  if (correctEl) animateNumberArabic(correctEl, correct);
  
  // Format last response time in ar-EG
  if (lastEl) {
    const formatted = formatArabicDate(data.lastResponse);
    lastEl.textContent = formatted;
  }
  
  // Update bars
  const totalBar = document.getElementById('totalBar');
  const todayBar = document.getElementById('todayBar');
  const correctBar = document.getElementById('correctBar');
  
  if (totalBar) totalBar.style.width = total > 0 ? '100%' : '0%';
  if (todayBar) todayBar.style.width = total > 0 ? Math.min((today / total) * 100, 100) + '%' : '0%';
  if (correctBar) correctBar.style.width = totalOnLastQ > 0 ? Math.min((correct / totalOnLastQ) * 100, 100) + '%' : '0%';
  
  // Update summary
  const correctPctEl = document.getElementById('correctPercentage');
  const todayPctEl = document.getElementById('todayPercentage');
  const formStatusEl = document.getElementById('formStatusText');
  
  if (correctPctEl) {
    const pct = totalOnLastQ > 0 ? Math.round((correct / totalOnLastQ) * 100) : 0;
    correctPctEl.textContent = toArabicNum(pct) + '٪';
  }
  if (todayPctEl) {
    const pct = total > 0 ? Math.round((today / total) * 100) : 0;
    todayPctEl.textContent = toArabicNum(pct) + '٪';
  }
  if (formStatusEl) {
    if (data.formStatus === 'open') {
      formStatusEl.textContent = 'مفتوح ✅';
      formStatusEl.style.color = 'var(--success)';
    } else if (data.formStatus === 'closed') {
      formStatusEl.textContent = 'مغلق 🔒';
      formStatusEl.style.color = 'var(--danger)';
    } else {
      formStatusEl.textContent = 'غير معروف';
      formStatusEl.style.color = 'var(--text-muted)';
    }
  }
  
  // Update subtitle for correct answers
  const correctSub = document.getElementById('correctSubtitle');
  if (correctSub && data.lastQuestion) {
    correctSub.textContent = 'من أصل ' + toArabicNum(totalOnLastQ) + ' إجابة على آخر سؤال';
  }
  
  // Update last refresh time
  const refreshTimeEl = document.getElementById('lastRefreshTime');
  if (refreshTimeEl) {
    refreshTimeEl.textContent = new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}

function updateLastQuestionCard(data) {
  const card = document.getElementById('lastQuestionCard');
  if (!card) return;
  
  const correct = data.correctAnswers || 0;
  const totalOnLastQ = data.totalAnswersOnLastQ || 0;
  const wrong = totalOnLastQ - correct;
  const pct = totalOnLastQ > 0 ? Math.round((correct / totalOnLastQ) * 100) : 0;
  const wrongPct = totalOnLastQ > 0 ? 100 - pct : 0;
  
  if (data.lastQuestion || totalOnLastQ > 0) {
    card.style.display = 'block';
    
    const qText = document.getElementById('lastQuestionText');
    if (qText) qText.textContent = data.lastQuestion || 'آخر سؤال في النموذج';
    
    const lqTotal = document.getElementById('lqTotalAnswers');
    const lqCorrect = document.getElementById('lqCorrectAnswers');
    const lqWrong = document.getElementById('lqWrongAnswers');
    const lqPct = document.getElementById('lqPercentage');
    
    if (lqTotal) lqTotal.textContent = toArabicNum(totalOnLastQ);
    if (lqCorrect) lqCorrect.textContent = toArabicNum(correct);
    if (lqWrong) lqWrong.textContent = toArabicNum(wrong);
    if (lqPct) lqPct.textContent = toArabicNum(pct) + '٪';
    
    // Progress bars
    const progressCorrect = document.getElementById('lqProgressCorrect');
    const progressWrong = document.getElementById('lqProgressWrong');
    if (progressCorrect) progressCorrect.style.width = pct + '%';
    if (progressWrong) progressWrong.style.width = wrongPct + '%';
    
    // Labels
    const correctPctLabel = document.getElementById('lqCorrectPct');
    const wrongPctLabel = document.getElementById('lqWrongPct');
    if (correctPctLabel) correctPctLabel.textContent = toArabicNum(pct) + '٪';
    if (wrongPctLabel) wrongPctLabel.textContent = toArabicNum(wrongPct) + '٪';
  } else {
    card.style.display = 'none';
  }
}

function animateNumberArabic(element, target) {
  const currentText = element.textContent;
  // Extract numeric value from Arabic or Western digits
  const current = parseInt(currentText.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) || 0;
  const diff = target - current;
  
  if (diff === 0) {
    element.textContent = toArabicNum(target);
    return;
  }
  
  const steps = 30;
  const increment = diff / steps;
  let step = 0;
  
  const timer = setInterval(() => {
    step++;
    if (step >= steps) {
      element.textContent = toArabicNum(target);
      clearInterval(timer);
    } else {
      element.textContent = toArabicNum(Math.round(current + increment * step));
    }
  }, 20);
}

function updateChart(data) {
  const ctx = document.getElementById('statsChart');
  if (!ctx) return;
  
  const today = data.todayResponses || 0;
  const total = data.totalResponses || 0;
  const avgPerDay = total > 0 ? Math.round(total / 7) : 0;
  
  // Use weeklyData from server if available, otherwise generate sample
  let labels = [];
  let values = [];
  
  if (data.weeklyData && Array.isArray(data.weeklyData)) {
    data.weeklyData.forEach(item => {
      labels.push(item.day || item.label);
      values.push(item.count || item.value || 0);
    });
  } else {
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }));
      if (i === 0) {
        values.push(today);
      } else {
        values.push(Math.max(0, avgPerDay + Math.floor(Math.random() * 10 - 5)));
      }
    }
  }
  
  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
  }
  
  AppState.chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'عدد الردود',
        data: values,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx: c, chartArea} = chart;
          if (!chartArea) return 'rgba(212, 160, 23, 0.3)';
          const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(212, 160, 23, 0.1)');
          gradient.addColorStop(1, 'rgba(212, 160, 23, 0.5)');
          return gradient;
        },
        borderColor: '#d4a017',
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 40,
        hoverBackgroundColor: 'rgba(212, 160, 23, 0.6)',
        hoverBorderColor: '#f0c040',
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          titleColor: '#d4a017',
          bodyColor: '#ffffff',
          borderColor: '#d4a017',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 8,
          titleFont: { family: 'Tajawal', size: 13, weight: '700' },
          bodyFont: { family: 'Tajawal', size: 12 },
          rtl: true,
          callbacks: {
            label: function(context) {
              return 'عدد الردود: ' + toArabicNum(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#666',
            font: { family: 'Tajawal', size: 12 },
            callback: function(value) {
              return toArabicNum(value);
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#888',
            font: { family: 'Tajawal', size: 11, weight: '500' }
          }
        }
      }
    }
  });
}

// Countdown timer
function resetCountdown() {
  AppState.countdownValue = 60;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const el = document.getElementById('refreshCountdown');
  if (el) {
    el.textContent = AppState.countdownValue;
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  AppState.countdownValue = 60;
  
  // Countdown every second
  AppState.countdownInterval = setInterval(() => {
    if (AppState.currentPage === 'stats') {
      AppState.countdownValue--;
      updateCountdownDisplay();
      
      if (AppState.countdownValue <= 0) {
        loadStats();
        // resetCountdown is called inside loadStats
      }
    }
  }, 1000);
}

function stopAutoRefresh() {
  if (AppState.statsInterval) {
    clearInterval(AppState.statsInterval);
    AppState.statsInterval = null;
  }
  if (AppState.countdownInterval) {
    clearInterval(AppState.countdownInterval);
    AppState.countdownInterval = null;
  }
}

// ============ Settings ============
function loadSettings() {
  const urlInput = document.getElementById('scriptURLInput');
  if (urlInput) {
    urlInput.value = getScriptURL();
  }
  checkScriptURLStatus();
}

function saveSettings() {
  const urlInput = document.getElementById('scriptURLInput');
  const url = urlInput.value.trim();
  
  if (!url) {
    showToast('يرجى إدخال رابط Google Apps Script', 'warning');
    return;
  }
  
  if (!url.startsWith('https://script.google.com/')) {
    showToast('الرابط غير صالح. يجب أن يبدأ بـ https://script.google.com/', 'error');
    return;
  }
  
  setScriptURL(url);
  showToast('تم حفظ الإعدادات بنجاح', 'success');
  checkScriptURLStatus();
  addActivityLog('تحديث إعدادات السكربت', true);
}

async function testConnection() {
  const scriptURL = getScriptURL();
  
  if (!scriptURL) {
    showToast('يرجى إدخال رابط السكربت أولاً', 'warning');
    return;
  }
  
  showToast('جاري اختبار الاتصال...', 'info');
  
  try {
    const response = await fetch(scriptURL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'stats' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('الاتصال ناجح! السكربت يعمل بشكل صحيح', 'success');
      updateConnectionStatus(true);
    } else {
      showToast('السكربت استجاب لكن بخطأ', 'warning');
      updateConnectionStatus(false);
    }
  } catch (error) {
    showToast('فشل الاتصال بالسكربت', 'error');
    updateConnectionStatus(false);
  }
}

function checkScriptURLStatus() {
  const url = getScriptURL();
  updateConnectionStatus(!!url, !url);
}

function updateConnectionStatus(connected, noUrl = false) {
  const statusEl = document.getElementById('urlStatus');
  if (statusEl) {
    if (noUrl) {
      statusEl.className = 'url-status disconnected';
      statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> لم يتم إعداد الرابط بعد';
    } else if (connected) {
      statusEl.className = 'url-status connected';
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> الرابط محفوظ';
    } else {
      statusEl.className = 'url-status disconnected';
      statusEl.innerHTML = '<i class="fas fa-times-circle"></i> خطأ في الاتصال';
    }
  }
}

// ============ Password Management ============
function changePassword() {
  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;
  
  if (!currentPass || !newPass || !confirmPass) {
    showToast('يرجى ملء جميع الحقول', 'warning');
    return;
  }
  
  if (newPass !== confirmPass) {
    showToast('كلمة المرور الجديدة غير متطابقة', 'error');
    return;
  }
  
  if (newPass.length < 4) {
    showToast('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
    return;
  }
  
  const users = getUsers();
  const user = users.find(u => u.username === AppState.currentUser.username);
  
  if (user && user.password === currentPass) {
    user.password = newPass;
    saveUsers(users);
    showToast('تم تغيير كلمة المرور بنجاح', 'success');
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
  } else {
    showToast('كلمة المرور الحالية غير صحيحة', 'error');
  }
}

// ============ Users Table ============
function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  
  const users = getUsers();
  
  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-users" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
          لا يوجد مستخدمون
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; background: ${user.role === 'admin' ? 'var(--gold-gradient)' : 'rgba(23, 162, 184, 0.3)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: ${user.role === 'admin' ? '#000' : 'var(--info)'}; font-weight: 700; font-size: 0.8rem;">
            ${user.username.charAt(0).toUpperCase()}
          </div>
          ${user.username}
        </div>
      </td>
      <td>
        <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-viewer'}">
          ${user.role === 'admin' ? 'مدير - تحكم كامل' : 'مشاهد - مشاهدة فقط'}
        </span>
      </td>
      <td>${new Date(user.createdAt).toLocaleDateString('ar-SA')}</td>
      <td>
        ${user.username !== 'admin' ? `
          <button class="btn-sm btn-edit" onclick="toggleUserRole(${user.id}, '${user.role}')">
            <i class="fas fa-exchange-alt"></i> تغيير الصلاحية
          </button>
          <button class="btn-sm btn-delete" onclick="confirmDeleteUser(${user.id}, '${user.username}')">
            <i class="fas fa-trash"></i> حذف
          </button>
        ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">المدير الرئيسي</span>'}
      </td>
    </tr>
  `).join('');
}

function toggleUserRole(id, currentRole) {
  const newRole = currentRole === 'admin' ? 'viewer' : 'admin';
  updateUserRole(id, newRole);
}

function confirmDeleteUser(id, username) {
  if (confirm(`هل أنت متأكد من حذف المستخدم "${username}"؟`)) {
    deleteUser(id);
  }
}

// ============ Add User Modal ============
function openAddUserModal() {
  document.getElementById('addUserModal').classList.add('active');
  document.getElementById('newUsername').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserRole').value = 'viewer';
}

function closeAddUserModal() {
  document.getElementById('addUserModal').classList.remove('active');
}

function saveNewUser() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newUserPassword').value;
  const role = document.getElementById('newUserRole').value;
  
  if (!username || !password) {
    showToast('يرجى ملء جميع الحقول', 'warning');
    return;
  }
  
  if (password.length < 4) {
    showToast('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
    return;
  }
  
  if (addUser(username, password, role)) {
    closeAddUserModal();
    renderUsersTable();
  }
}

// ============ Toast Notifications ============
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="removeToast(this.parentElement)">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    removeToast(toast);
  }, APP_CONFIG.toastDuration);
}

function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('removing');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

// ============ Activity Log ============
function addActivityLog(action, success) {
  const log = {
    action,
    success,
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  };
  
  AppState.activityLog.unshift(log);
  if (AppState.activityLog.length > 20) {
    AppState.activityLog.pop();
  }
  
  renderActivityLog();
}

function renderActivityLog() {
  const container = document.getElementById('activityLogList');
  if (!container) return;
  
  if (AppState.activityLog.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">لا توجد أنشطة بعد</div>';
    return;
  }
  
  container.innerHTML = AppState.activityLog.map(log => `
    <div class="log-item">
      <div class="log-icon ${log.success ? 'success' : 'error'}">
        <i class="fas ${log.success ? 'fa-check' : 'fa-times'}"></i>
      </div>
      <span class="log-text">${log.action}</span>
      <span class="log-time">${log.time}</span>
    </div>
  `).join('');
}

// ============ Utility Functions ============
function shakeElement(element) {
  element.style.animation = 'none';
  element.offsetHeight; // trigger reflow
  element.style.animation = 'shake 0.5s ease';
  setTimeout(() => {
    element.style.animation = '';
  }, 500);
}

// Add shake animation
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-10px); }
    40% { transform: translateX(10px); }
    60% { transform: translateX(-10px); }
    80% { transform: translateX(10px); }
  }
`;
document.head.appendChild(shakeStyle);

// ============ Keyboard Shortcuts ============
document.addEventListener('keydown', function(e) {
  // Enter to login
  if (e.key === 'Enter' && document.getElementById('loginContainer').style.display !== 'none') {
    login();
  }
  
  // Escape to close modal
  if (e.key === 'Escape') {
    closeAddUserModal();
  }
});

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', function() {
  // Ensure default admin exists
  const users = getUsers();
  if (users.length === 0) {
    saveUsers([{
      id: 1,
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      createdAt: new Date().toISOString()
    }]);
  }
  
  // Check for existing session
  checkSession();
  
  // Initialize activity log
  renderActivityLog();
});


// ============================================
// Auto Control (Scheduled Tasks) Module
// ============================================

// ============ Auto Control State ============
const AutoControl = {
  tasks: [],
  log: [],
  timers: {},
  checkerInterval: null,

  // Load from localStorage
  load() {
    this.tasks = Storage.get('ac_tasks', []);
    this.log = Storage.get('ac_log', []);
  },

  // Save to localStorage
  saveTasks() {
    Storage.set('ac_tasks', this.tasks);
  },

  saveLog() {
    Storage.set('ac_log', this.log);
  },

  // Add log entry
  addLog(taskName, action, success, message) {
    const entry = {
      id: Date.now(),
      taskName,
      action,
      success,
      message: message || (success ? 'تم التنفيذ بنجاح' : 'فشل التنفيذ'),
      time: new Date().toISOString()
    };
    this.log.unshift(entry);
    if (this.log.length > 100) this.log = this.log.slice(0, 100);
    this.saveLog();
    renderAutoLog();
  }
};

// ============ Schedule Type Change ============
function onScheduleTypeChange() {
  const type = document.getElementById('acScheduleType').value;
  const dateField = document.getElementById('acDateField');
  const weekField = document.getElementById('acWeekDaysField');
  const monthField = document.getElementById('acMonthDayField');

  // Show/hide fields based on type
  if (dateField) dateField.style.display = type === 'once' ? 'block' : 'none';
  if (weekField) weekField.style.display = type === 'weekly' ? 'block' : 'none';
  if (monthField) monthField.style.display = type === 'monthly' ? 'block' : 'none';
}

// ============ Populate Month Days ============
function populateMonthDays() {
  const select = document.getElementById('acMonthDay');
  if (!select) return;
  select.innerHTML = '';
  for (let i = 1; i <= 28; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = toArabicNum(i);
    select.appendChild(opt);
  }
}

// ============ Save Scheduled Task ============
function saveScheduledTask() {
  const action = document.getElementById('acAction').value;
  const scheduleType = document.getElementById('acScheduleType').value;
  const hour = parseInt(document.getElementById('acHour').value);
  const minute = parseInt(document.getElementById('acMinute').value);
  const taskName = document.getElementById('acTaskName').value.trim();

  // Validation
  if (!action) {
    showToast('يرجى اختيار الإجراء المطلوب', 'warning');
    return;
  }

  // Build task object
  const task = {
    id: Date.now(),
    action,
    actionLabel: getActionLabel(action),
    scheduleType,
    hour,
    minute,
    name: taskName || getActionLabel(action),
    active: true,
    createdAt: new Date().toISOString(),
    lastRun: null,
    runCount: 0
  };

  // Type-specific fields
  if (scheduleType === 'once') {
    const dateVal = document.getElementById('acDate').value;
    if (!dateVal) {
      showToast('يرجى تحديد تاريخ التنفيذ', 'warning');
      return;
    }
    task.date = dateVal;
  }

  if (scheduleType === 'weekly') {
    const checkedDays = [];
    document.querySelectorAll('#acWeekDaysField input[type="checkbox"]:checked').forEach(cb => {
      checkedDays.push(parseInt(cb.value));
    });
    if (checkedDays.length === 0) {
      showToast('يرجى اختيار يوم واحد على الأقل', 'warning');
      return;
    }
    task.weekDays = checkedDays;
  }

  if (scheduleType === 'monthly') {
    task.monthDay = parseInt(document.getElementById('acMonthDay').value);
  }

  // Save
  AutoControl.tasks.push(task);
  AutoControl.saveTasks();

  showToast('تم حفظ المهمة المجدولة بنجاح', 'success');
  addActivityLog('إضافة مهمة مجدولة: ' + task.name, true);
  AutoControl.addLog(task.name, task.action, true, 'تم إنشاء المهمة');

  resetScheduleForm();
  renderScheduledTasks();
  startAutoControlChecker();
}

// ============ Reset Form ============
function resetScheduleForm() {
  const acAction = document.getElementById('acAction');
  const acScheduleType = document.getElementById('acScheduleType');
  const acHour = document.getElementById('acHour');
  const acMinute = document.getElementById('acMinute');
  const acDate = document.getElementById('acDate');
  const acTaskName = document.getElementById('acTaskName');

  if (acAction) acAction.value = '';
  if (acScheduleType) acScheduleType.value = 'once';
  if (acHour) acHour.value = '0';
  if (acMinute) acMinute.value = '0';
  if (acDate) acDate.value = '';
  if (acTaskName) acTaskName.value = '';

  // Uncheck all weekdays
  document.querySelectorAll('#acWeekDaysField input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  onScheduleTypeChange();
}

// ============ Render Scheduled Tasks ============
function renderScheduledTasks() {
  const container = document.getElementById('acTasksList');
  const countEl = document.getElementById('acTasksCount');
  if (!container) return;

  const tasks = AutoControl.tasks;

  if (countEl) {
    countEl.textContent = toArabicNum(tasks.length) + ' مهام';
  }

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="ac-empty">
        <i class="fas fa-calendar-times"></i>
        <p>لا توجد مهام مجدولة حالياً</p>
        <span>أضف مهمة جديدة من النموذج أعلاه</span>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const scheduleText = getScheduleText(task);
    const timeText = formatTimeArabic(task.hour, task.minute);
    const statusClass = task.active ? 'active' : 'paused';
    const statusIcon = task.active ? 'fa-play-circle' : 'fa-pause-circle';
    const toggleIcon = task.active ? 'fa-pause' : 'fa-play';
    const toggleTitle = task.active ? 'إيقاف مؤقت' : 'تفعيل';
    const lastRunText = task.lastRun ? formatArabicDate(task.lastRun) : 'لم تُنفَّذ بعد';

    return `
      <div class="ac-task-item" data-task-id="${task.id}">
        <div class="ac-task-icon ${statusClass}">
          <i class="fas ${statusIcon}"></i>
        </div>
        <div class="ac-task-info">
          <div class="ac-task-name">
            <span class="ac-status-dot ${statusClass}"></span>
            ${escapeHtml(task.name)}
          </div>
          <div class="ac-task-detail">
            <span><i class="fas fa-bolt"></i> ${task.actionLabel}</span>
            <span><i class="fas fa-clock"></i> ${timeText}</span>
            <span><i class="fas fa-calendar-alt"></i> ${scheduleText}</span>
            <span><i class="fas fa-redo"></i> ${toArabicNum(task.runCount)} تنفيذ</span>
          </div>
        </div>
        <div class="ac-task-actions">
          <button class="ac-task-btn btn-toggle-active" onclick="toggleTask(${task.id})" title="${toggleTitle}">
            <i class="fas ${toggleIcon}"></i>
          </button>
          <button class="ac-task-btn btn-delete-task" onclick="deleteTask(${task.id})" title="حذف">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ============ Helper: Schedule Description ============
function getScheduleText(task) {
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  switch (task.scheduleType) {
    case 'once': {
      if (task.date) {
        const d = new Date(task.date + 'T00:00:00');
        return 'مرة واحدة: ' + d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return 'مرة واحدة';
    }
    case 'daily':
      return 'يومياً';
    case 'weekly': {
      if (task.weekDays && task.weekDays.length > 0) {
        const names = task.weekDays.map(d => dayNames[d]);
        return 'أسبوعياً: ' + names.join('، ');
      }
      return 'أسبوعياً';
    }
    case 'monthly':
      return 'شهرياً: اليوم ' + toArabicNum(task.monthDay || 1);
    default:
      return task.scheduleType;
  }
}

// ============ Helper: Format Time ============
function formatTimeArabic(hour, minute) {
  const h = hour % 12 || 12;
  const period = hour < 12 ? 'ص' : 'م';
  const m = String(minute).padStart(2, '0');
  return toArabicNum(h) + ':' + toArabicNum(m) + ' ' + period;
}

// ============ Helper: Escape HTML ============
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ Toggle Task Active/Paused ============
function toggleTask(taskId) {
  const task = AutoControl.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.active = !task.active;
  AutoControl.saveTasks();
  renderScheduledTasks();

  const statusText = task.active ? 'تم تفعيل المهمة' : 'تم إيقاف المهمة مؤقتاً';
  showToast(statusText + ': ' + task.name, task.active ? 'success' : 'warning');
  AutoControl.addLog(task.name, task.action, true, statusText);
}

// ============ Delete Task ============
function deleteTask(taskId) {
  const task = AutoControl.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (!confirm('هل أنت متأكد من حذف المهمة "' + task.name + '"؟')) return;

  AutoControl.tasks = AutoControl.tasks.filter(t => t.id !== taskId);
  AutoControl.saveTasks();
  renderScheduledTasks();

  showToast('تم حذف المهمة: ' + task.name, 'success');
  addActivityLog('حذف مهمة مجدولة: ' + task.name, true);
  AutoControl.addLog(task.name, task.action, true, 'تم حذف المهمة');
}

// ============ Render Execution Log ============
function renderAutoLog() {
  const container = document.getElementById('acLogList');
  if (!container) return;

  const logs = AutoControl.log;

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="ac-empty">
        <i class="fas fa-clipboard-list"></i>
        <p>لا توجد تنفيذات سابقة</p>
      </div>
    `;
    return;
  }

  container.innerHTML = logs.slice(0, 50).map(log => {
    const timeStr = new Date(log.time).toLocaleString('ar-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return `
      <div class="ac-log-item">
        <div class="ac-log-icon ${log.success ? 'success' : 'error'}">
          <i class="fas ${log.success ? 'fa-check' : 'fa-times'}"></i>
        </div>
        <div class="ac-log-text">
          <strong>${escapeHtml(log.taskName)}</strong> — ${escapeHtml(log.message)}
        </div>
        <div class="ac-log-time">${timeStr}</div>
      </div>
    `;
  }).join('');
}

// ============ Clear Execution Log ============
function clearAutoLog() {
  if (!confirm('هل أنت متأكد من مسح سجل التنفيذات؟')) return;
  AutoControl.log = [];
  AutoControl.saveLog();
  renderAutoLog();
  showToast('تم مسح سجل التنفيذات', 'success');
}

// ============ Auto Control Checker (runs every 30 seconds) ============
function startAutoControlChecker() {
  if (AutoControl.checkerInterval) return;

  // Check immediately
  checkAndExecuteTasks();

  // Then check every 30 seconds
  AutoControl.checkerInterval = setInterval(() => {
    checkAndExecuteTasks();
  }, 30000);
}

function stopAutoControlChecker() {
  if (AutoControl.checkerInterval) {
    clearInterval(AutoControl.checkerInterval);
    AutoControl.checkerInterval = null;
  }
}

async function checkAndExecuteTasks() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0=Sunday
  const currentDate = now.getDate();
  const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  for (const task of AutoControl.tasks) {
    if (!task.active) continue;

    // Check if already ran in this time window (within last 2 minutes)
    if (task.lastRun) {
      const lastRunTime = new Date(task.lastRun);
      const diffMs = now - lastRunTime;
      if (diffMs < 120000) continue; // Skip if ran less than 2 minutes ago
    }

    // Check time match (within 1 minute window)
    const timeMatch = (currentHour === task.hour && currentMinute === task.minute);
    if (!timeMatch) continue;

    let shouldRun = false;

    switch (task.scheduleType) {
      case 'once':
        if (task.date === todayStr) {
          shouldRun = true;
        }
        break;

      case 'daily':
        shouldRun = true;
        break;

      case 'weekly':
        if (task.weekDays && task.weekDays.includes(currentDay)) {
          shouldRun = true;
        }
        break;

      case 'monthly':
        if (currentDate === task.monthDay) {
          shouldRun = true;
        }
        break;
    }

    if (shouldRun) {
      await executeScheduledTask(task);
    }
  }
}

async function executeScheduledTask(task) {
  try {
    const result = await sendAction(task.action);

    task.lastRun = new Date().toISOString();
    task.runCount = (task.runCount || 0) + 1;

    if (result && result.success) {
      AutoControl.addLog(task.name, task.action, true, 'تم التنفيذ التلقائي بنجاح');
      showToast('تنفيذ تلقائي: ' + task.name + ' — نجاح', 'success');
    } else {
      AutoControl.addLog(task.name, task.action, false, 'فشل التنفيذ التلقائي');
      showToast('تنفيذ تلقائي: ' + task.name + ' — فشل', 'error');
    }

    // If one-time task, deactivate after execution
    if (task.scheduleType === 'once') {
      task.active = false;
    }

    AutoControl.saveTasks();
    renderScheduledTasks();

  } catch (error) {
    console.error('Auto execution error:', error);
    AutoControl.addLog(task.name, task.action, false, 'خطأ: ' + error.message);
    showToast('خطأ في التنفيذ التلقائي: ' + task.name, 'error');
  }
}

// ============ Initialize Auto Control on page load ============
function initAutoControl() {
  AutoControl.load();
  populateMonthDays();
  onScheduleTypeChange();
  renderScheduledTasks();
  renderAutoLog();
  startAutoControlChecker();

  // Set default date to today
  const dateInput = document.getElementById('acDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;
  }
}

// ============ Update navigateTo for autocontrol page ============
const _originalNavigateTo = navigateTo;
navigateTo = function(page) {
  _originalNavigateTo(page);

  if (page === 'autocontrol') {
    initAutoControl();
  }
};

// Start the checker on page load if there are active tasks
document.addEventListener('DOMContentLoaded', function() {
  AutoControl.load();
  if (AutoControl.tasks.some(t => t.active)) {
    startAutoControlChecker();
  }
});
