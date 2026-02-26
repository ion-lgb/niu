import { theme } from 'antd';

export const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: '#6366f1',
        colorBgContainer: '#1a2035',
        colorBgElevated: '#1e2642',
        colorBgLayout: '#0a0e17',
        colorBorder: '#1e293b',
        colorBorderSecondary: '#1e293b',
        borderRadius: 10,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    },
    components: {
        Layout: {
            siderBg: '#111827',
            headerBg: '#111827',
            bodyBg: '#0a0e17',
        },
        Menu: {
            darkItemBg: '#111827',
            darkSubMenuItemBg: '#111827',
            darkItemSelectedBg: 'rgba(99, 102, 241, 0.12)',
            darkItemSelectedColor: '#818cf8',
        },
        Table: {
            headerBg: '#111827',
            rowHoverBg: '#1e2642',
        },
        Card: {
            colorBgContainer: '#1a2035',
        },
        Statistic: {
            titleFontSize: 12,
            contentFontSize: 24,
        },
    },
};
