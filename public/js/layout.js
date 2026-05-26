function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function renderLayout(activeMenu) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const isAdmin = user.role === 'admin';
  
  const sidebar = `
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>剪切测试平台</h2>
      </div>
      <ul class="sidebar-menu">
        <li><a href="dashboard.html" class="${activeMenu === 'dashboard' ? 'active' : ''}"><span class="icon">📊</span>仪表盘</a></li>
        <li><a href="new-test.html" class="${activeMenu === 'new-test' ? 'active' : ''}"><span class="icon">➕</span>新建试验</a></li>
        <li><a href="specimens.html" class="${activeMenu === 'specimens' ? 'active' : ''}"><span class="icon">📋</span>试样管理</a></li>
        <li><a href="history.html" class="${activeMenu === 'history' ? 'active' : ''}"><span class="icon">📁</span>历史数据</a></li>
        <li><a href="visualization.html" class="${activeMenu === 'visualization' ? 'active' : ''}"><span class="icon">📈</span>数据可视化</a></li>
        ${isAdmin ? `<li><a href="users.html" class="${activeMenu === 'users' ? 'active' : ''}"><span class="icon">👥</span>用户管理</a></li>` : ''}
      </ul>
    </div>
  `;

  const topbar = `
    <div class="topbar">
      <h1>${getPageTitle(activeMenu)}</h1>
      <div class="user-info">
        <span>${user.username}</span>
        <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-tester'}">
          ${user.role === 'admin' ? '管理员' : '实验员'}
        </span>
        <button class="btn btn-secondary btn-sm" onclick="logout()">退出</button>
      </div>
    </div>
  `;

  return { sidebar, topbar };
}

function getPageTitle(menu) {
  const titles = {
    'dashboard': '仪表盘',
    'new-test': '新建试验',
    'specimens': '试样管理',
    'history': '历史数据查询',
    'visualization': '数据可视化',
    'users': '用户管理'
  };
  return titles[menu] || '层间剪切强度测试平台';
}

function logout() {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}

function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN');
}

function formatNumber(num, decimals = 4) {
  if (num === null || num === undefined) return '-';
  return Number(num).toFixed(decimals);
}
