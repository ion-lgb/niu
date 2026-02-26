import { useState } from 'react';
import {
    Settings, Key, Globe, Database, Cpu, CheckCircle,
    XCircle, Loader2, Save, TestTube,
} from 'lucide-react';
import { testConnection } from '../api';

function SettingsPage() {
    const [config, setConfig] = useState({
        wp_url: '',
        wp_username: '',
        wp_app_password: '',
        ai_provider: 'deepseek',
        ai_model: 'deepseek-chat',
        ai_api_key: '',
        ai_base_url: '',
        default_post_status: 'draft',
        enable_ai_rewrite: true,
        enable_ai_analyze: true,
        rewrite_style: 'resource_site',
    });

    const [testing, setTesting] = useState({});
    const [testResults, setTestResults] = useState({});

    const updateConfig = (key, value) => {
        setConfig({ ...config, [key]: value });
    };

    const handleTestConnection = async (type) => {
        setTesting({ ...testing, [type]: true });
        setTestResults({ ...testResults, [type]: null });
        try {
            await testConnection(type);
            setTestResults({ ...testResults, [type]: { success: true } });
        } catch (err) {
            setTestResults({
                ...testResults,
                [type]: { success: false, error: err.response?.data?.detail || err.message },
            });
        } finally {
            setTesting({ ...testing, [type]: false });
        }
    };

    const ConnectionStatus = ({ type }) => {
        const result = testResults[type];
        if (!result) return null;
        return result.success ? (
            <span className="badge badge-success" style={{ marginLeft: 'var(--spacing-sm)' }}>
                <CheckCircle size={12} /> 连接成功
            </span>
        ) : (
            <span className="badge badge-error" style={{ marginLeft: 'var(--spacing-sm)' }}>
                <XCircle size={12} /> {result.error || '连接失败'}
            </span>
        );
    };

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">系统设置</h1>
                <p className="page-subtitle">配置 WordPress、AI 模型和采集参数</p>
            </div>

            <div className="page-body">
                {/* WordPress Settings */}
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <Globe size={18} />
                            <span className="card-title">WordPress 连接</span>
                            <ConnectionStatus type="wordpress" />
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleTestConnection('wordpress')}
                            disabled={testing.wordpress}
                        >
                            {testing.wordpress ? <Loader2 className="spinner" size={14} /> : <TestTube size={14} />}
                            测试连接
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="form-group">
                            <label className="form-label" htmlFor="wp_url">站点地址</label>
                            <input
                                id="wp_url"
                                className="form-input"
                                type="url"
                                placeholder="https://yourgamesite.com"
                                value={config.wp_url}
                                onChange={(e) => updateConfig('wp_url', e.target.value)}
                            />
                            <p className="form-hint">WordPress 站点的完整 URL</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="wp_username">用户名</label>
                                <input
                                    id="wp_username"
                                    className="form-input"
                                    type="text"
                                    placeholder="admin"
                                    value={config.wp_username}
                                    onChange={(e) => updateConfig('wp_username', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="wp_app_password">应用密码</label>
                                <input
                                    id="wp_app_password"
                                    className="form-input"
                                    type="password"
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    value={config.wp_app_password}
                                    onChange={(e) => updateConfig('wp_app_password', e.target.value)}
                                />
                                <p className="form-hint">在 WordPress 后台 → 用户 → 应用密码 中生成</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Settings */}
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <Cpu size={18} />
                            <span className="card-title">AI 模型配置</span>
                            <ConnectionStatus type="ai" />
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleTestConnection('ai')}
                            disabled={testing.ai}
                        >
                            {testing.ai ? <Loader2 className="spinner" size={14} /> : <TestTube size={14} />}
                            测试连接
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="ai_provider">AI 提供商</label>
                                <select
                                    id="ai_provider"
                                    className="form-select"
                                    value={config.ai_provider}
                                    onChange={(e) => updateConfig('ai_provider', e.target.value)}
                                >
                                    <option value="deepseek">DeepSeek</option>
                                    <option value="openai">OpenAI</option>
                                    <option value="anthropic">Anthropic</option>
                                    <option value="openrouter">OpenRouter</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ai_model">模型名称</label>
                                <input
                                    id="ai_model"
                                    className="form-input"
                                    type="text"
                                    placeholder="deepseek-chat"
                                    value={config.ai_model}
                                    onChange={(e) => updateConfig('ai_model', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="ai_api_key">
                                <Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                API Key
                            </label>
                            <input
                                id="ai_api_key"
                                className="form-input"
                                type="password"
                                placeholder="sk-..."
                                value={config.ai_api_key}
                                onChange={(e) => updateConfig('ai_api_key', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="ai_base_url">自定义 API 端点（可选）</label>
                            <input
                                id="ai_base_url"
                                className="form-input"
                                type="url"
                                placeholder="https://api.deepseek.com/v1"
                                value={config.ai_base_url}
                                onChange={(e) => updateConfig('ai_base_url', e.target.value)}
                            />
                            <p className="form-hint">使用第三方代理或自建接口时填写</p>
                        </div>
                    </div>
                </div>

                {/* Collect Defaults */}
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <Settings size={18} />
                            <span className="card-title">采集默认设置</span>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label" htmlFor="default_post_status">默认发布状态</label>
                                <select
                                    id="default_post_status"
                                    className="form-select"
                                    value={config.default_post_status}
                                    onChange={(e) => updateConfig('default_post_status', e.target.value)}
                                >
                                    <option value="draft">草稿</option>
                                    <option value="publish">立即发布</option>
                                    <option value="pending">待审核</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="rewrite_style">默认改写风格</label>
                                <select
                                    id="rewrite_style"
                                    className="form-select"
                                    value={config.rewrite_style}
                                    onChange={(e) => updateConfig('rewrite_style', e.target.value)}
                                >
                                    <option value="resource_site">资源站推荐</option>
                                    <option value="review">游戏评测</option>
                                    <option value="seo_heavy">SEO 优化</option>
                                    <option value="brief">简短概述</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <label className="form-check">
                                <input
                                    type="checkbox"
                                    checked={config.enable_ai_rewrite}
                                    onChange={(e) => updateConfig('enable_ai_rewrite', e.target.checked)}
                                />
                                <span>默认启用 AI 改写</span>
                            </label>
                            <label className="form-check">
                                <input
                                    type="checkbox"
                                    checked={config.enable_ai_analyze}
                                    onChange={(e) => updateConfig('enable_ai_analyze', e.target.checked)}
                                />
                                <span>默认启用 AI 分析</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Save */}
                <div className="btn-group">
                    <button className="btn btn-primary btn-lg">
                        <Save size={18} /> 保存设置
                    </button>
                </div>
            </div>
        </>
    );
}

export default SettingsPage;
