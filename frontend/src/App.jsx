import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Gamepad2, Search, ListTodo, Settings } from 'lucide-react';
import CollectPage from './pages/CollectPage';
import QueuePage from './pages/QueuePage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <Gamepad2 size={20} />
            </div>
            <span className="sidebar-title">Steam Collector</span>
          </div>

          <nav className="sidebar-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Search size={20} />
              <span>游戏采集</span>
            </NavLink>

            <NavLink
              to="/queue"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ListTodo size={20} />
              <span>采集队列</span>
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={20} />
              <span>系统设置</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            v0.1.0 — Steam Collector
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<CollectPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
