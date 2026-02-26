import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { login } from '../auth';

const { Title, Text } = Typography;

export default function LoginPage({ onLoginSuccess }) {
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await login(values.username, values.password);
            message.success('登录成功');
            onLoginSuccess?.();
        } catch (err) {
            const status = err.response?.status;
            if (status === 429) {
                message.error('登录尝试过于频繁，请稍后再试');
            } else if (status === 401) {
                message.error('用户名或密码错误');
            } else {
                message.error('登录失败：' + (err.response?.data?.detail || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        }}>
            <Card
                style={{
                    width: 400,
                    borderRadius: 16,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    background: 'rgba(30, 27, 75, 0.6)',
                    backdropFilter: 'blur(20px)',
                }}
                styles={{ body: { padding: '40px 32px' } }}
            >
                <Space direction="vertical" size={24} style={{ width: '100%', textAlign: 'center' }}>
                    <div>
                        <div style={{
                            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <LockOutlined style={{ fontSize: 28, color: '#fff' }} />
                        </div>
                        <Title level={3} style={{ margin: 0, color: '#e2e8f0' }}>Steam Collector</Title>
                        <Text type="secondary" style={{ color: '#94a3b8' }}>登录以继续</Text>
                    </div>

                    <Form onFinish={onFinish} layout="vertical" size="large" autoComplete="off">
                        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                            <Input
                                prefix={<UserOutlined style={{ color: '#6366f1' }} />}
                                placeholder="用户名"
                                style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: 10,
                                    color: '#e2e8f0',
                                }}
                            />
                        </Form.Item>
                        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#6366f1' }} />}
                                placeholder="密码"
                                style={{
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    borderRadius: 10,
                                    color: '#e2e8f0',
                                }}
                            />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                style={{
                                    height: 44,
                                    borderRadius: 10,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    border: 'none',
                                    fontWeight: 600,
                                    fontSize: 15,
                                }}
                            >
                                登 录
                            </Button>
                        </Form.Item>
                    </Form>
                </Space>
            </Card>
        </div>
    );
}
