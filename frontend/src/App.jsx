import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import {
  SearchOutlined, UnorderedListOutlined, SettingOutlined,
  DashboardOutlined, SunOutlined, MoonOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { Switch, Space, Button, Tooltip } from 'antd';
import DashboardPage from './pages/DashboardPage';
import CollectPage from './pages/CollectPage';
import QueuePage from './pages/QueuePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import NotificationBell from './components/NotificationBell';
import { useThemeMode } from './main';
import { isAuthenticated, logout } from './auth';

const route = {
  path: '/',
  routes: [
    { path: '/', name: '仪表盘', icon: <DashboardOutlined /> },
    { path: '/collect', name: '游戏采集', icon: <SearchOutlined /> },
    { path: '/queue', name: '采集队列', icon: <UnorderedListOutlined /> },
    { path: '/settings', name: '系统设置', icon: <SettingOutlined /> },
  ],
};

function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode();
  return (
    <Space size={6} align="center">
      <SunOutlined style={{ color: isDark ? '#64748b' : '#f59e0b', fontSize: 15 }} />
      <Switch
        size="small"
        checked={isDark}
        onChange={toggleTheme}
        style={{ background: isDark ? '#6366f1' : '#cbd5e1' }}
      />
      <MoonOutlined style={{ color: isDark ? '#818cf8' : '#64748b', fontSize: 15 }} />
    </Space>
  );
}

function LayoutWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useThemeMode();

  return (
    <ProLayout
      title="Steam Collector"
      logo={false}
      route={route}
      location={{ pathname: location.pathname }}
      navTheme={isDark ? 'realDark' : 'light'}
      layout="mix"
      fixSiderbar
      fixedHeader
      contentWidth="Fluid"
      siderWidth={220}
      token={{
        sider: isDark ? {
          colorMenuBackground: '#111827',
          colorTextMenu: '#94a3b8',
          colorTextMenuSelected: '#818cf8',
          colorBgMenuItemSelected: 'rgba(99, 102, 241, 0.12)',
        } : {
          colorTextMenuSelected: '#6366f1',
          colorBgMenuItemSelected: 'rgba(99, 102, 241, 0.08)',
        },
        header: isDark ? {
          colorBgHeader: '#111827',
        } : {},
      }}
      menuItemRender={(item, dom) => (
        <a onClick={() => navigate(item.path || '/')}>{dom}</a>
      )}
      headerContentRender={() => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: 16 }}>
          <ThemeToggle />
          <NotificationBell />
          <Tooltip title="退出登录">
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: '#94a3b8' }}
            />
          </Tooltip>
        </div>
      )}
      footerRender={() => (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: 12 }}>
          v0.1.0 — Steam Collector
        </div>
      )}
    >
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/collect" element={<CollectPage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </ProLayout>
  );
}

function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLoginSuccess={() => setAuthed(true)} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<LayoutWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
