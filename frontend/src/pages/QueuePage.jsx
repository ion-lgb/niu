import { useState, useEffect, useCallback, useRef } from 'react';
import { ProTable, StatisticCard } from '@ant-design/pro-components';
import { Tag, Button, Space, Popconfirm, Drawer, Descriptions, Alert, Typography, App } from 'antd';
import {
    ReloadOutlined, DeleteOutlined, RedoOutlined,
    CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined,
    CloseCircleOutlined, AppstoreOutlined, TagsOutlined,
    PauseCircleOutlined, CaretRightOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { getRecordStats, getRecords, getRecord, deleteRecord, startQueueTask, startAllQueueTasks } from '../api';

const { Text } = Typography;

const statusConfig = {
    completed: { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    running: { text: '进行中', color: 'processing', icon: <PlayCircleOutlined /> },
    failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
    pending: { text: '排队中', color: 'warning', icon: <ClockCircleOutlined /> },
    waiting: { text: '待确认', color: 'default', icon: <PauseCircleOutlined /> },
};

const actionMap = {
    create: '发布文章',
    update: '更新数据',
};

export default function QueuePage() {
    const { message } = App.useApp();
    const [stats, setStats] = useState({ total: 0, completed: 0, running: 0, failed: 0, pending: 0, waiting: 0 });
    const [filter, setFilter] = useState('all');
    const actionRef = useRef();

    // 详情抽屉
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await getRecordStats();
            setStats(res.data);
        } catch (err) {
            console.error('加载统计数据失败:', err);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    // 自动轮询：有 running 或 pending 任务时 10s 刷新
    useEffect(() => {
        if (stats.running > 0 || stats.pending > 0) {
            const timer = setInterval(() => {
                fetchStats();
                actionRef.current?.reload();
            }, 10000);
            return () => clearInterval(timer);
        }
    }, [stats.running, stats.pending, fetchStats]);

    const openDetail = async (recordId) => {
        setDrawerOpen(true);
        setDetailLoading(true);
        setDetail(null);
        try {
            const res = await getRecord(recordId);
            setDetail(res.data);
        } catch (err) {
            message.error('加载详情失败');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDelete = async (recordId) => {
        try {
            await deleteRecord(recordId);
            message.success('已删除');
            actionRef.current?.reload();
            fetchStats();
        } catch (err) {
            message.error('删除失败');
        }
    };

    const handleStart = async (recordId) => {
        try {
            await startQueueTask(recordId);
            message.success('已开始采集');
            actionRef.current?.reload();
            fetchStats();
        } catch (err) {
            message.error('开始采集失败: ' + (err.response?.data?.detail || err.message));
        }
    };

    const handleStartAll = async () => {
        try {
            const res = await startAllQueueTasks();
            message.success(`已启动 ${res.data.started} 个任务`);
            actionRef.current?.reload();
            fetchStats();
        } catch (err) {
            message.error('批量启动失败');
        }
    };

    const columns = [
        {
            title: 'App ID',
            dataIndex: 'app_id',
            width: 120,
            render: (val) => <code style={{ color: '#818cf8' }}>{val}</code>,
        },
        {
            title: '游戏名称',
            dataIndex: 'game_name',
            ellipsis: true,
            render: (val) => val || '-',
        },
        {
            title: '任务类型',
            dataIndex: 'action',
            width: 120,
            render: (val) => <Tag>{actionMap[val] || val}</Tag>,
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (val) => {
                const cfg = statusConfig[val] || { text: val, color: 'default' };
                return <Tag icon={cfg.icon} color={cfg.color}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'WP 文章',
            dataIndex: 'post_id',
            width: 120,
            render: (val) => val ? <a style={{ color: '#818cf8', fontWeight: 500 }}>#{val}</a> : '-',
        },
        {
            title: '创建时间',
            dataIndex: 'created_at',
            width: 180,
            render: (val) => val ? new Date(val).toLocaleString('zh-CN') : '-',
        },
        {
            title: '操作',
            width: 140,
            align: 'center',
            render: (_, record) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Space size={4}>
                        {record.status === 'waiting' && (
                            <Button
                                type="primary"
                                size="small"
                                icon={<CaretRightOutlined />}
                                title="开始采集"
                                onClick={() => handleStart(record.id)}
                            >
                                开始
                            </Button>
                        )}
                        {record.status === 'failed' && (
                            <Button type="text" size="small" icon={<RedoOutlined />} title="重试" />
                        )}
                        {(record.status === 'waiting' || record.status === 'failed') && (
                            <Popconfirm
                                title="确定删除？"
                                okText="删除"
                                cancelText="取消"
                                onConfirm={() => handleDelete(record.id)}
                            >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} title="删除" />
                            </Popconfirm>
                        )}
                    </Space>
                </div>
            ),
        },
    ];

    const statItems = [
        { key: 'total', title: '总任务', icon: <AppstoreOutlined />, color: '#6366f1' },
        { key: 'waiting', title: '待确认', icon: <PauseCircleOutlined />, color: '#8b5cf6' },
        { key: 'pending', title: '排队中', icon: <ClockCircleOutlined />, color: '#f59e0b' },
        { key: 'running', title: '进行中', icon: <PlayCircleOutlined />, color: '#3b82f6' },
        { key: 'completed', title: '已完成', icon: <CheckCircleOutlined />, color: '#22c55e' },
        { key: 'failed', title: '失败', icon: <CloseCircleOutlined />, color: '#ef4444' },
    ];

    const tabItems = [
        { key: 'all', tab: `全部 ${stats.total}` },
        { key: 'waiting', tab: `待确认 ${stats.waiting || 0}` },
        { key: 'pending', tab: `排队中 ${stats.pending}` },
        { key: 'running', tab: `进行中 ${stats.running}` },
        { key: 'completed', tab: `已完成 ${stats.completed}` },
        { key: 'failed', tab: `失败 ${stats.failed}` },
    ];

    return (
        <div>
            {/* 统计卡片 */}
            <StatisticCard.Group direction="row" style={{ marginBottom: 24 }}>
                {statItems.map((item) => (
                    <StatisticCard
                        key={item.key}
                        statistic={{
                            title: item.title,
                            value: stats[item.key] || 0,
                            icon: (
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: item.color, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: 22,
                                    boxShadow: `0 0 16px ${item.color}44`,
                                }}>
                                    {item.icon}
                                </div>
                            ),
                        }}
                    />
                ))}
            </StatisticCard.Group>

            {/* 数据表格 */}
            <ProTable
                actionRef={actionRef}
                columns={columns}
                request={async () => {
                    const params = filter === 'all' ? {} : { status: filter };
                    const res = await getRecords(params);
                    await fetchStats();
                    return { data: res.data.items, success: true, total: res.data.items.length };
                }}
                rowKey="id"
                search={false}
                dateFormatter="string"
                headerTitle="采集队列"
                cardBordered
                onRow={(record) => ({
                    onClick: () => openDetail(record.id),
                    style: { cursor: 'pointer' },
                })}
                toolbar={{
                    menu: {
                        type: 'tab',
                        activeKey: filter,
                        items: tabItems,
                        onChange: (key) => {
                            setFilter(key);
                            actionRef.current?.reload();
                        },
                    },
                }}
                toolBarRender={() => [
                    (stats.running > 0 || stats.pending > 0) && (
                        <Tag key="auto" color="processing">自动刷新中</Tag>
                    ),
                    (stats.waiting || 0) > 0 && (
                        <Popconfirm
                            key="startAll"
                            title={`确定开始全部 ${stats.waiting} 个待确认任务？`}
                            okText="全部开始"
                            cancelText="取消"
                            onConfirm={handleStartAll}
                        >
                            <Button type="primary" icon={<ThunderboltOutlined />}>
                                全部开始 ({stats.waiting})
                            </Button>
                        </Popconfirm>
                    ),
                    <Button
                        key="refresh"
                        icon={<ReloadOutlined />}
                        onClick={() => actionRef.current?.reload()}
                    >
                        刷新
                    </Button>,
                ]}
                pagination={{ pageSize: 20 }}
                options={false}
            />

            {/* 任务详情抽屉 */}
            <Drawer
                title={detail ? `任务详情 - ${detail.game_name || `App ${detail.app_id}`}` : '任务详情'}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={560}
                loading={detailLoading}
            >
                {detail && (
                    <div>
                        <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
                            <Descriptions.Item label="记录 ID">{detail.id}</Descriptions.Item>
                            <Descriptions.Item label="App ID">
                                <code style={{ color: '#818cf8' }}>{detail.app_id}</code>
                            </Descriptions.Item>
                            <Descriptions.Item label="游戏名称" span={2}>
                                {detail.game_name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="任务类型">
                                <Tag>{actionMap[detail.action] || detail.action}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="状态">
                                {(() => {
                                    const cfg = statusConfig[detail.status] || { text: detail.status, color: 'default' };
                                    return <Tag icon={cfg.icon} color={cfg.color}>{cfg.text}</Tag>;
                                })()}
                            </Descriptions.Item>
                            {detail.post_id && (
                                <Descriptions.Item label="WP 文章 ID" span={2}>
                                    <a style={{ color: '#818cf8', fontWeight: 500 }}>#{detail.post_id}</a>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="创建时间">
                                {detail.created_at ? new Date(detail.created_at).toLocaleString('zh-CN') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="更新时间">
                                {detail.updated_at ? new Date(detail.updated_at).toLocaleString('zh-CN') : '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* 采集参数 */}
                        {detail.options && (
                            <div style={{ marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>采集参数</Text>
                                <Descriptions column={2} size="small" bordered>
                                    {Object.entries(detail.options).map(([k, v]) => (
                                        <Descriptions.Item key={k} label={k}>
                                            {String(v)}
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            </div>
                        )}

                        {/* SEO 数据 */}
                        {detail.seo_data && (
                            <div style={{ marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>SEO 数据</Text>
                                <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label="标题">{detail.seo_data.title}</Descriptions.Item>
                                    <Descriptions.Item label="描述">{detail.seo_data.description}</Descriptions.Item>
                                    <Descriptions.Item label="关键词">{detail.seo_data.keywords}</Descriptions.Item>
                                </Descriptions>
                            </div>
                        )}

                        {/* 标签 */}
                        {detail.tags?.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                                    <TagsOutlined style={{ marginRight: 4 }} />标签
                                </Text>
                                <Space size={[4, 8]} wrap>
                                    {detail.tags.map((tag, i) => (
                                        <Tag key={i} color="purple">{tag}</Tag>
                                    ))}
                                </Space>
                            </div>
                        )}

                        {/* 错误信息 */}
                        {detail.error && (
                            <Alert
                                type="error"
                                showIcon
                                message="错误信息"
                                description={detail.error}
                                style={{ marginBottom: 24 }}
                            />
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
}
