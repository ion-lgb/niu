import { useState, useEffect, useRef } from 'react';
import { Badge, Popover, List, Typography, Space, Tag, Button, notification } from 'antd';
import { BellOutlined, CheckCircleOutlined, CloseCircleOutlined, ClearOutlined } from '@ant-design/icons';
import { getToken } from '../auth';

const { Text } = Typography;

export default function NotificationBell() {
    const [messages, setMessages] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        const token = getToken();
        const url = token ? `/api/events/stream?token=${encodeURIComponent(token)}` : '/api/events/stream';
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const msg = {
                    id: Date.now(),
                    type: data.type,
                    app_id: data.app_id,
                    game_name: data.game_name || `App ${data.app_id}`,
                    post_id: data.post_id,
                    error: data.error,
                    time: new Date(),
                };

                setMessages((prev) => [msg, ...prev].slice(0, 50));
                setUnread((prev) => prev + 1);

                // 弹出通知
                if (data.type === 'task_done') {
                    notification.success({
                        message: '采集完成',
                        description: `${msg.game_name} 采集成功${data.post_id ? ` → WP #${data.post_id}` : ''}`,
                        placement: 'topRight',
                        duration: 5,
                    });
                } else if (data.type === 'task_fail') {
                    notification.error({
                        message: '采集失败',
                        description: `App ${data.app_id} 采集失败: ${data.error || '未知错误'}`,
                        placement: 'topRight',
                        duration: 8,
                    });
                }
            } catch {
                // 忽略解析错误（如心跳）
            }
        };

        es.onerror = () => {
            // 连接断开会自动重连
        };

        return () => {
            es.close();
        };
    }, []);

    const handleOpenChange = (visible) => {
        setOpen(visible);
        if (visible) {
            setUnread(0);
        }
    };

    const clearAll = () => {
        setMessages([]);
        setUnread(0);
    };

    const content = (
        <div style={{ width: 360, maxHeight: 400, overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 8px' }}>
                <Text strong>通知中心</Text>
                {messages.length > 0 && (
                    <Button type="link" size="small" icon={<ClearOutlined />} onClick={clearAll}>
                        清空
                    </Button>
                )}
            </div>
            {messages.length > 0 ? (
                <List
                    size="small"
                    dataSource={messages}
                    renderItem={(item) => (
                        <List.Item key={item.id} style={{ padding: '8px 0' }}>
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                <Space>
                                    {item.type === 'task_done' ? (
                                        <CheckCircleOutlined style={{ color: '#22c55e' }} />
                                    ) : (
                                        <CloseCircleOutlined style={{ color: '#ef4444' }} />
                                    )}
                                    <Text strong style={{ fontSize: 13 }}>{item.game_name}</Text>
                                    {item.type === 'task_done' ? (
                                        <Tag color="success" style={{ fontSize: 11 }}>成功</Tag>
                                    ) : (
                                        <Tag color="error" style={{ fontSize: 11 }}>失败</Tag>
                                    )}
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {item.type === 'task_done' && item.post_id ? `→ WP #${item.post_id}` : ''}
                                    {item.error ? item.error.substring(0, 60) : ''}
                                    {' · '}
                                    {item.time.toLocaleTimeString('zh-CN')}
                                </Text>
                            </Space>
                        </List.Item>
                    )}
                />
            ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                    暂无通知
                </div>
            )}
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            open={open}
            onOpenChange={handleOpenChange}
            placement="bottomRight"
        >
            <Badge count={unread} size="small" offset={[-2, 2]}>
                <BellOutlined style={{ fontSize: 18, color: '#94a3b8', cursor: 'pointer' }} />
            </Badge>
        </Popover>
    );
}
