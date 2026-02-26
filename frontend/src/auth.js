/**
 * 认证工具 - Token 管理和登录 API
 */

import axios from 'axios';

const TOKEN_KEY = 'sc_auth_token';

/** 获取存储的 token */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/** 存储 token */
export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

/** 清除 token */
export function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

/** 是否已登录 */
export function isAuthenticated() {
    return !!getToken();
}

/** 登录 */
export async function login(username, password) {
    const resp = await axios.post('/api/auth/login', { username, password });
    const { token } = resp.data;
    setToken(token);
    return resp.data;
}

/** 登出 */
export function logout() {
    removeToken();
    window.location.href = '/login';
}
