const API_BASE = 'http://localhost:3000/api';

const api = {
  _headers() {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = 'Bearer ' + token;
    return h;
  },

  async get(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, { headers: this._headers() });
      return await res.json();
    } catch (e) {
      return { error: 'Network error. Is the server running?' };
    }
  },

  async getPublic(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint);
      return await res.json();
    } catch (e) {
      return { error: 'Network error.' };
    }
  },

  async post(endpoint, body) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error.' };
    }
  },

  async patch(endpoint, body) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'PATCH',
        headers: this._headers(),
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error.' };
    }
  },

  async delete(endpoint) {
    try {
      const res = await fetch(API_BASE + endpoint, {
        method: 'DELETE',
        headers: this._headers()
      });
      return await res.json();
    } catch (e) {
      return { error: 'Network error.' };
    }
  }
};

// Shared utility
function showMsg(el, text, type = 'info') {
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}
