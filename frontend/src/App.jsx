import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-components';
import {
  SearchOutlined, UnorderedListOutlined, SettingOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import DashboardPage from './pages/DashboardPage';
import CollectPage from './pages/CollectPage';
import QueuePage from './pages/QueuePage';
import SettingsPage from './pages/SettingsPage';
import NotificationBell from './components/NotificationBell';

const route = {
  path: '/',
  routes: [
    { path: '/', name: '仪表盘', icon: <DashboardOutlined /> },
    { path: '/collect', name: '游戏采集', icon: <SearchOutlined /> },
    { path: '/queue', name: '采集队列', icon: <UnorderedListOutlined /> },
    { path: '/settings', name: '系统设置', icon: <SettingOutlined /> },
  ],
};

function LayoutWrapper() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ProLayout
      title="Steam Collector"
      logo={false}
      route={route}
      location={{ pathname: location.pathname }}
      navTheme="realDark"
      layout="side"
      fixSiderbar
      contentWidth="Fluid"
      siderWidth={220}
      token={{
        sider: {
          colorMenuBackground: '#111827',
          colorTextMenu: '#94a3b8',
          colorTextMenuSelected: '#818cf8',
          colorBgMenuItemSelected: 'rgba(99, 102, 241, 0.12)',
        },
        header: {
          colorBgHeader: '#111827',
        },
      }}
      menuItemRender={(item, dom) => (
        <a onClick={() => navigate(item.path || '/')}>{dom}</a>
      )}
      actionsRender={() => [
        <NotificationBell key="bell" />,
      ]}
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
  return (
    <BrowserRouter>
      <LayoutWrapper />
    </BrowserRouter>
  );
}

export default App;
