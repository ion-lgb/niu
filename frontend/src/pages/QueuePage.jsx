import { useState, useEffect, useCallback, useRef } from 'react';
import { ProTable, StatisticCard } from '@ant-design/pro-components';
import { Tag, Button, Space, Popconfirm } from 'antd';
import {
    ReloadOutlined, DeleteOutlined, RedoOutlined,
    CheckCircleOutlined, ClockCircleOutlined, PlayCircleOutlined,
    CloseCircleOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { getRecordStats, getRecords } from '../api';

const statusConfig = {
    completed: { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
    running: { text: '进行中', color: 'processing', icon: <PlayCircleOutlined /> },
    failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
    pending: { text: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
};

const actionMap = {
    create: '发布文章',
    update: '更新数据',
};

export default function QueuePage() {
    const [stats, setStats] = useState({ total: 0, completed: 0, running: 0, failed: 0, pending: 0 });
    const [filter, setFilter] = useState('all');
    const actionRef = useRef();

    const fetchStats = useCallback(async () => {
        try {
            const res = await getRecordStats();
            setStats(res.data);
        } catch (err) {
            console.error('加载统计数据失败:', err);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

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
            width: 100,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    {record.status === 'failed' && (
                        <Button type="text" size="small" icon={<RedoOutlined />} title="重试" />
                    )}
                    <Popconfirm title="确定删除？" okText="删除" cancelText="取消">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} title="删除" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const statItems = [
        { key: 'total', title: '总任务', icon: <AppstoreOutlined />, color: '#6366f1' },
        { key: 'completed', title: '已完成', icon: <CheckCircleOutlined />, color: '#22c55e' },
        { key: 'running', title: '进行中', icon: <PlayCircleOutlined />, color: '#f59e0b' },
        { key: 'failed', title: '失败', icon: <CloseCircleOutlined />, color: '#ef4444' },
    ];

    const tabItems = [
        { key: 'all', tab: `全部 ${stats.total}` },
        { key: 'completed', tab: `已完成 ${stats.completed}` },
        { key: 'running', tab: `进行中 ${stats.running}` },
        { key: 'failed', tab: `失败 ${stats.failed}` },
        { key: 'pending', tab: `等待中 ${stats.pending}` },
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
                            value: stats[item.key],
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
                headerTitle="采集记录"
                cardBordered
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
        </div>
    );
}
