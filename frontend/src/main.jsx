import { StrictMode, useState, createContext, useContext, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { darkTheme, lightTheme } from './theme';
import App from './App.jsx';
import './App.css';

export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => { },
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

function Root() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('sc_theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('sc_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const themeConfig = useMemo(() => isDark ? darkTheme : lightTheme, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ConfigProvider theme={themeConfig} locale={zhCN}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
