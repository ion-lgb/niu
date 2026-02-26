import { useState } from 'react';
import { Card, Form, Input, Select, Checkbox, Button, Space, Tag, Row, Col, message } from 'antd';
import {
    GlobalOutlined, RobotOutlined, SettingOutlined,
    KeyOutlined, ApiOutlined, SaveOutlined,
} from '@ant-design/icons';
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
            message.success(`${type === 'wordpress' ? 'WordPress' : 'AI'} 连接成功`);
        } catch (err) {
            const errorMsg = err.response?.data?.detail || err.message;
            setTestResults({ ...testResults, [type]: { success: false, error: errorMsg } });
            message.error(`连接失败: ${errorMsg}`);
        } finally {
            setTesting({ ...testing, [type]: false });
        }
    };

    const ConnectionTag = ({ type }) => {
        const result = testResults[type];
        if (!result) return null;
        return result.success
            ? <Tag color="success">连接成功</Tag>
            : <Tag color="error">{result.error || '连接失败'}</Tag>;
    };

    return (
        <div>
            {/* WordPress 设置 */}
            <Card
                title={
                    <Space>
                        <GlobalOutlined />
                        <span>WordPress 连接</span>
                        <ConnectionTag type="wordpress" />
                    </Space>
                }
                extra={
                    <Button
                        icon={<ApiOutlined />}
                        loading={testing.wordpress}
                        onClick={() => handleTestConnection('wordpress')}
                    >
                        测试连接
                    </Button>
                }
                style={{ marginBottom: 24 }}
            >
                <Form layout="vertical">
                    <Form.Item label="站点地址" help="WordPress 站点的完整 URL">
                        <Input
                            placeholder="https://yourgamesite.com"
                            value={config.wp_url}
                            onChange={(e) => updateConfig('wp_url', e.target.value)}
                        />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="用户名">
                                <Input
                                    placeholder="admin"
                                    value={config.wp_username}
                                    onChange={(e) => updateConfig('wp_username', e.target.value)}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="应用密码" help="在 WordPress 后台 → 用户 → 应用密码 中生成">
                                <Input.Password
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    value={config.wp_app_password}
                                    onChange={(e) => updateConfig('wp_app_password', e.target.value)}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {/* AI 模型配置 */}
            <Card
                title={
                    <Space>
                        <RobotOutlined />
                        <span>AI 模型配置</span>
                        <ConnectionTag type="ai" />
                    </Space>
                }
                extra={
                    <Button
                        icon={<ApiOutlined />}
                        loading={testing.ai}
                        onClick={() => handleTestConnection('ai')}
                    >
                        测试连接
                    </Button>
                }
                style={{ marginBottom: 24 }}
            >
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="AI 提供商">
                                <Select
                                    value={config.ai_provider}
                                    onChange={(v) => updateConfig('ai_provider', v)}
                                    options={[
                                        { value: 'deepseek', label: 'DeepSeek' },
                                        { value: 'openai', label: 'OpenAI' },
                                        { value: 'anthropic', label: 'Anthropic' },
                                        { value: 'openrouter', label: 'OpenRouter' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="模型名称">
                                <Input
                                    placeholder="deepseek-chat"
                                    value={config.ai_model}
                                    onChange={(e) => updateConfig('ai_model', e.target.value)}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label={<span><KeyOutlined style={{ marginRight: 4 }} />API Key</span>}>
                        <Input.Password
                            placeholder="sk-..."
                            value={config.ai_api_key}
                            onChange={(e) => updateConfig('ai_api_key', e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item label="自定义 API 端点（可选）" help="使用第三方代理或自建接口时填写">
                        <Input
                            placeholder="https://api.deepseek.com/v1"
                            value={config.ai_base_url}
                            onChange={(e) => updateConfig('ai_base_url', e.target.value)}
                        />
                    </Form.Item>
                </Form>
            </Card>

            {/* 采集默认设置 */}
            <Card
                title={
                    <Space>
                        <SettingOutlined />
                        <span>采集默认设置</span>
                    </Space>
                }
                style={{ marginBottom: 24 }}
            >
                <Form layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="默认发布状态">
                                <Select
                                    value={config.default_post_status}
                                    onChange={(v) => updateConfig('default_post_status', v)}
                                    options={[
                                        { value: 'draft', label: '草稿' },
                                        { value: 'publish', label: '立即发布' },
                                        { value: 'pending', label: '待审核' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="默认改写风格">
                                <Select
                                    value={config.rewrite_style}
                                    onChange={(v) => updateConfig('rewrite_style', v)}
                                    options={[
                                        { value: 'resource_site', label: '资源站推荐' },
                                        { value: 'review', label: '游戏评测' },
                                        { value: 'seo_heavy', label: 'SEO 优化' },
                                        { value: 'brief', label: '简短概述' },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item>
                        <Space size="large">
                            <Checkbox
                                checked={config.enable_ai_rewrite}
                                onChange={(e) => updateConfig('enable_ai_rewrite', e.target.checked)}
                            >
                                默认启用 AI 改写
                            </Checkbox>
                            <Checkbox
                                checked={config.enable_ai_analyze}
                                onChange={(e) => updateConfig('enable_ai_analyze', e.target.checked)}
                            >
                                默认启用 AI 分析
                            </Checkbox>
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            {/* 保存按钮 */}
            <Button type="primary" size="large" icon={<SaveOutlined />}>
                保存设置
            </Button>
        </div>
    );
}

export default SettingsPage;
