const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    localStorage.setItem('token', token);
  },

  clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        this.clearAuth();
        window.location.href = '/index.html';
      }
    }

    return data;
  },

  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async changePassword(oldPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  },

  async getUsers() {
    return this.request('/users');
  },

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  async getSpecimens(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/specimens${query ? '?' + query : ''}`);
  },

  async getSpecimen(id) {
    return this.request(`/specimens/${id}`);
  },

  async createSpecimen(specimenData) {
    return this.request('/specimens', {
      method: 'POST',
      body: JSON.stringify(specimenData)
    });
  },

  async updateSpecimen(id, specimenData) {
    return this.request(`/specimens/${id}`, {
      method: 'PUT',
      body: JSON.stringify(specimenData)
    });
  },

  async deleteSpecimen(id) {
    return this.request(`/specimens/${id}`, {
      method: 'DELETE'
    });
  },

  async getTests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tests${query ? '?' + query : ''}`);
  },

  async getTest(id) {
    return this.request(`/tests/${id}`);
  },

  async createTest(testData) {
    return this.request('/tests', {
      method: 'POST',
      body: JSON.stringify(testData)
    });
  },

  async deleteTest(id) {
    return this.request(`/tests/${id}`, {
      method: 'DELETE'
    });
  },

  async getStats() {
    return this.request('/tests/stats/summary');
  }
};
