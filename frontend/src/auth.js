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

/**
 * 解码 JWT payload（不做签名验证，仅用于读取过期时间）
 * @returns {object|null} payload 或 null
 */
function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch {
        return null;
    }
}

/**
 * 是否已登录 — 检查 token 存在且未过期
 */
export function isAuthenticated() {
    const token = getToken();
    if (!token || token === 'undefined' || token === 'null') {
        removeToken();
        return false;
    }
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) {
        removeToken();
        return false;
    }
    // exp 是 Unix 秒级时间戳，留 10 秒余量
    if (payload.exp * 1000 <= Date.now() + 10_000) {
        removeToken();
        return false;
    }
    return true;
}

/** 登录 */
export async function login(username, password) {
    const resp = await axios.post('/api/auth/login', { username, password });
    const { token } = resp.data;
    // 校验后端返回的 token 是有效 JWT 字符串
    if (!token || typeof token !== 'string' || !decodeJwtPayload(token)) {
        throw new Error('服务端返回了无效的认证令牌');
    }
    setToken(token);
    return resp.data;
}

/** 登出 */
export function logout() {
    removeToken();
    window.location.href = '/login';
}
