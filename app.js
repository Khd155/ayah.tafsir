/* ========================================
   Competition Dashboard - Main JavaScript
   ======================================== */

// ============ Configuration ============
const APP_CONFIG = {
  defaultPassword: 'admin123',
  statsRefreshInterval: 60000, // 60 seconds
  toastDuration: 4000,
  version: '1.0.1'
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
      if (val === null) return defaultValue;
      return JSON.parse(val);
    } catch (e) {
      console.error(`Storage.get error for key "${key}":`, e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`Successfully saved to localStorage: ${key}`);
      return true;
    } catch (e) {
      console.error(`Storage.set error for key "${key}":`, e);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`Storage.remove error for key "${key}":`, e);
      return false;
    }
  }
};

// ============ Script URL Management ============
function getScriptURL() {
  // Check both keys as requested
  return Storage.get('scriptUrl') || Storage.get('scriptURL', '');
}

function setScriptURL(url) {
  // Save to both keys for compatibility
  Storage.set('scriptUrl', url);
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
  
  if (page === 'auto') {
    renderScheduledTasks();
    renderAutoLog();
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
    stats: 'تحديث الإحصائيات'
  };
  return labels[action] || action;
}

// ============ Stats Management ============
async function loadStats() {
  const data = await sendAction('stats');
  if (data) {
    updateStatsUI(data);
    updateLastQuestionCard(data);
    updateChart(data);
    resetCountdown();
  }
}

function toArabicNum(num) {
  if (num === undefined || num === null) return '٠';
  const id = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num.toString().replace(/[0-9]/g, function(w) {
    return id[+w];
  });
}

function updateStatsUI(data) {
  const total = data.totalResponses || 0;
  const today = data.todayResponses || 0;
  const correct = data.correctAnswers || 0;
  const totalOnLastQ = data.totalAnswersOnLastQ || 0;
  
  const totalEl = document.getElementById('totalResponses');
  const todayEl = document.getElementById('todayResponses');
  const correctEl = document.getElementById('correctAnswers');
  const todayPctEl = document.getElementById('todayPercentage');
  const formStatusEl = document.getElementById('formStatus');
  
  if (totalEl) animateNumberArabic(totalEl, total);
  if (todayEl) animateNumberArabic(todayEl, today);
  if (correctEl) animateNumberArabic(correctEl, correct);
  
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
  
  const correctSub = document.getElementById('correctSubtitle');
  if (correctSub && data.lastQuestion) {
    correctSub.textContent = 'من أصل ' + toArabicNum(totalOnLastQ) + ' إجابة على آخر سؤال';
  }
  
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
    
    const progressCorrect = document.getElementById('lqProgressCorrect');
    const progressWrong = document.getElementById('lqProgressWrong');
    if (progressCorrect) progressCorrect.style.width = pct + '%';
    if (progressWrong) progressWrong.style.width = wrongPct + '%';
    
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
  
  if (typeof Chart !== 'undefined') {
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
          legend: { display: false },
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
            grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
            ticks: {
              color: '#666',
              font: { family: 'Tajawal', size: 12 },
              callback: function(value) { return toArabicNum(value); }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#888', font: { family: 'Tajawal', size: 11, weight: '500' } }
          }
        }
      }
    });
  }
}

// Countdown timer
function resetCountdown() {
  AppState.countdownValue = 60;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const el = document.getElementById('refreshCountdown');
  if (el) {
    el.textContent = toArabicNum(AppState.countdownValue);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  AppState.countdownValue = 60;
  AppState.countdownInterval = setInterval(() => {
    if (AppState.currentPage === 'stats') {
      AppState.countdownValue--;
      updateCountdownDisplay();
      if (AppState.countdownValue <= 0) {
        loadStats();
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
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> الرابط مفعّل ومتصل';
    } else {
      statusEl.className = 'url-status disconnected';
      statusEl.innerHTML = '<i class="fas fa-times-circle"></i> خطأ في الاتصال بالرابط';
    }
  }
}

// ============ Toast Notifications ============
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="toast-content">${message}</div>
    <button class="toast-close" onclick="removeToast(this.parentElement)"><i class="fas fa-times"></i></button>
  `;
  
  container.appendChild(toast);
  setTimeout(() => { removeToast(toast); }, APP_CONFIG.toastDuration);
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
  
  // Save to localStorage immediately
  Storage.set('activityLog', AppState.activityLog);
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
  setTimeout(() => { element.style.animation = ''; }, 500);
}

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeArabic(h, m) {
  const period = h >= 12 ? 'م' : 'ص';
  const hour = h % 12 || 12;
  return `${toArabicNum(hour)}:${toArabicNum(m.toString().padStart(2, '0'))} ${period}`;
}

function formatArabicDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('ar-EG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', function() {
  // 1. Load Activity Log from Storage
  AppState.activityLog = Storage.get('activityLog', []);
  renderActivityLog();

  // 2. Load AutoControl Data
  AutoControl.load();
  
  // 3. Ensure default admin exists
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
  
  // 4. Check for existing session
  checkSession();
  
  // 5. Initialize AutoControl
  populateMonthDays();
  renderScheduledTasks();
  renderAutoLog();
  startAutoControlChecker();
  
  // 6. Load Settings if on settings page
  if (AppState.currentPage === 'settings') {
    loadSettings();
  }
});

// ============================================
// Auto Control (Scheduled Tasks) Module
// ============================================

const AutoControl = {
  tasks: [],
  log: [],
  timers: {},
  checkerInterval: null,

  load() {
    this.tasks = Storage.get('ac_tasks', []);
    this.log = Storage.get('ac_log', []);
    console.log('AutoControl loaded:', this.tasks.length, 'tasks,', this.log.length, 'logs');
  },

  saveTasks() {
    Storage.set('ac_tasks', this.tasks);
  },

  saveLog() {
    Storage.set('ac_log', this.log);
  },

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

function onScheduleTypeChange() {
  const type = document.getElementById('acScheduleType').value;
  const dateField = document.getElementById('acDateField');
  const weekField = document.getElementById('acWeekDaysField');
  const monthField = document.getElementById('acMonthDayField');

  if (dateField) dateField.style.display = type === 'once' ? 'block' : 'none';
  if (weekField) weekField.style.display = type === 'weekly' ? 'block' : 'none';
  if (monthField) monthField.style.display = type === 'monthly' ? 'block' : 'none';
}

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

function saveScheduledTask() {
  const action = document.getElementById('acAction').value;
  const scheduleType = document.getElementById('acScheduleType').value;
  const hour = parseInt(document.getElementById('acHour').value);
  const minute = parseInt(document.getElementById('acMinute').value);
  const taskName = document.getElementById('acTaskName').value.trim();

  if (!action) {
    showToast('يرجى اختيار الإجراء المطلوب', 'warning');
    return;
  }

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

  AutoControl.tasks.push(task);
  AutoControl.saveTasks();

  showToast('تم حفظ المهمة المجدولة بنجاح', 'success');
  addActivityLog('إضافة مهمة مجدولة: ' + task.name, true);
  AutoControl.addLog(task.name, task.action, true, 'تم إنشاء المهمة');

  resetScheduleForm();
  renderScheduledTasks();
  startAutoControlChecker();
}

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

  document.querySelectorAll('#acWeekDaysField input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  onScheduleTypeChange();
}

function renderScheduledTasks() {
  const container = document.getElementById('acTasksList');
  const countEl = document.getElementById('acTasksCount');
  if (!container) return;

  const tasks = AutoControl.tasks;
  if (countEl) countEl.textContent = toArabicNum(tasks.length) + ' مهام';

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
          </div>
          <div class="ac-task-meta">
            آخر تنفيذ: ${lastRunText} | عدد التنفيذات: ${toArabicNum(task.runCount)}
          </div>
        </div>
        <div class="ac-task-actions">
          <button class="ac-btn-icon" onclick="toggleTask(${task.id})" title="${toggleTitle}">
            <i class="fas ${toggleIcon}"></i>
          </button>
          <button class="ac-btn-icon delete" onclick="deleteTask(${task.id})" title="حذف">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function getScheduleText(task) {
  if (task.scheduleType === 'once') return 'مرة واحدة (' + task.date + ')';
  if (task.scheduleType === 'daily') return 'يومياً';
  if (task.scheduleType === 'weekly') {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return 'أسبوعياً (' + task.weekDays.map(d => days[d]).join('، ') + ')';
  }
  if (task.scheduleType === 'monthly') return 'شهرياً (يوم ' + toArabicNum(task.monthDay) + ')';
  return '';
}

function toggleTask(id) {
  const task = AutoControl.tasks.find(t => t.id === id);
  if (task) {
    task.active = !task.active;
    AutoControl.saveTasks();
    renderScheduledTasks();
    showToast(task.active ? 'تم تفعيل المهمة' : 'تم إيقاف المهمة مؤقتاً', 'info');
  }
}

function deleteTask(id) {
  if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
    AutoControl.tasks = AutoControl.tasks.filter(t => t.id !== id);
    AutoControl.saveTasks();
    renderScheduledTasks();
    showToast('تم حذف المهمة بنجاح', 'success');
  }
}

function renderAutoLog() {
  const container = document.getElementById('acLogList');
  if (!container) return;

  if (AutoControl.log.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">لا توجد سجلات تنفيذ بعد</td></tr>';
    return;
  }

  container.innerHTML = AutoControl.log.map(entry => `
    <tr>
      <td>${formatArabicDate(entry.time)}</td>
      <td><strong>${escapeHtml(entry.taskName)}</strong></td>
      <td>${getActionLabel(entry.action)}</td>
      <td>
        <span class="ac-badge ${entry.success ? 'success' : 'danger'}">
          ${entry.success ? 'ناجح' : 'فشل'}
        </span>
      </td>
      <td>${escapeHtml(entry.message)}</td>
    </tr>
  `).join('');
}

function startAutoControlChecker() {
  if (AutoControl.checkerInterval) clearInterval(AutoControl.checkerInterval);
  
  AutoControl.checkerInterval = setInterval(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentDate = now.toISOString().split('T')[0];
    const currentMonthDay = now.getDate();

    AutoControl.tasks.forEach(task => {
      if (!task.active) return;

      const isTime = task.hour === currentHour && task.minute === currentMinute;
      if (!isTime) return;

      const lastRunDate = task.lastRun ? new Date(task.lastRun).toISOString().split('T')[0] : null;
      const lastRunTime = task.lastRun ? new Date(task.lastRun).getHours() + ':' + new Date(task.lastRun).getMinutes() : null;
      const currentTimeStr = currentHour + ':' + currentMinute;

      if (lastRunDate === currentDate && lastRunTime === currentTimeStr) return;

      let shouldRun = false;
      if (task.scheduleType === 'once' && task.date === currentDate) shouldRun = true;
      else if (task.scheduleType === 'daily') shouldRun = true;
      else if (task.scheduleType === 'weekly' && task.weekDays.includes(currentDay)) shouldRun = true;
      else if (task.scheduleType === 'monthly' && task.monthDay === currentMonthDay) shouldRun = true;

      if (shouldRun) {
        executeAutoTask(task);
      }
    });
  }, 30000); // Check every 30 seconds
}

async function executeAutoTask(task) {
  console.log('Executing auto task:', task.name);
  task.lastRun = new Date().toISOString();
  task.runCount++;
  AutoControl.saveTasks();
  renderScheduledTasks();

  const result = await sendAction(task.action);
  if (result && result.success) {
    AutoControl.addLog(task.name, task.action, true, 'تم التنفيذ التلقائي بنجاح');
  } else {
    AutoControl.addLog(task.name, task.action, false, 'فشل التنفيذ التلقائي: ' + (result ? result.message : 'خطأ اتصال'));
  }

  if (task.scheduleType === 'once') {
    task.active = false;
    AutoControl.saveTasks();
    renderScheduledTasks();
  }
}
