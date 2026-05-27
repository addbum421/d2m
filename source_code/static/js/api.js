/**
 * api.js — Django REST API 통신 모듈
 * CSRF 토큰 자동 포함
 */

function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(r => r.startsWith('csrftoken='))
    ?.split('=')[1] ?? '';
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const API = {
  /** 현재 유저 정보 */
  getMe: () => request('/accounts/me/'),

  /** 맵 목록 */
  listMaps: () => request('/api/maps/'),

  /** 맵 불러오기 */
  getMap: (id) => request(`/api/maps/${id}/`),

  /** 마지막 편집 맵 (로그인 복구) */
  getLastMap: () => request('/api/maps/last/'),

  /** 맵 저장 (수동) */
  saveMap: (payload) => request('/api/maps/save/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  /** 자동저장 */
  autosave: (payload) => request('/api/maps/autosave/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  /** 맵 삭제 */
  deleteMap: (id) => request(`/api/maps/${id}/`, { method: 'DELETE' }),
};
