// Core API configuration and utilities
const API_BASE = "http://localhost:3000"; // Replace with API Gateway URL when deploying

class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = localStorage.getItem('quiz_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  static async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
}

class App {
  static initAuth() {
    const user = JSON.parse(localStorage.getItem('quiz_user'));
    if (!user && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
       window.location.href = 'index.html';
    }
    return user;
  }

  static logout() {
    localStorage.removeItem('quiz_token');
    localStorage.removeItem('quiz_user');
    window.location.href = 'index.html';
  }

  static setupNavbar() {
    const user = JSON.parse(localStorage.getItem('quiz_user'));
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    if (user) {
      nav.innerHTML = `
        <a href="dashboard.html" class="brand">NovaQuiz</a>
        <div class="nav-links">
          ${user.role === 'admin' ? '<a href="admin.html">Create Quiz</a>' : ''}
          <a href="dashboard.html">Dashboard</a>
          <a href="#" id="logout-btn">Logout (${user.username})</a>
        </div>
      `;
      document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    } else {
      nav.innerHTML = `
        <a href="index.html" class="brand">NovaQuiz</a>
      `;
    }
  }

  static showAlert(elementId, message, type='error') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert ${type}`;
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}
