import { useState, useEffect, useCallback } from 'react';
import { StatisticCard } from '@ant-design/pro-components';
import { Card, Timeline, Tag, Typography, Row, Col, Empty, Spin, Space } from 'antd';
import {
    AppstoreOutlined, CheckCircleOutlined, PlayCircleOutlined,
    CloseCircleOutlined, ClockCircleOutlined, RiseOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import { getRecordStats, getDashboardTrend, getDashboardActivity } from '../api';

const { Text, Title } = Typography;

const statusConfig = {
    completed: { text: '已完成', color: '#22c55e', icon: <CheckCircleOutlined /> },
    running: { text: '进行中', color: '#f59e0b', icon: <PlayCircleOutlined /> },
    failed: { text: '失败', color: '#ef4444', icon: <CloseCircleOutlined /> },
    pending: { text: '等待中', color: '#94a3b8', icon: <ClockCircleOutlined /> },
};

export default function DashboardPage() {
    const [stats, setStats] = useState({ total: 0, completed: 0, running: 0, failed: 0, pending: 0 });
    const [trend, setTrend] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        try {
            const [statsRes, trendRes, activityRes] = await Promise.all([
                getRecordStats(),
                getDashboardTrend(7),
                getDashboardActivity(10),
            ]);
            setStats(statsRes.data);
            setTrend(trendRes.data.items || []);
            setActivity(activityRes.data.items || []);
        } catch (err) {
            console.error('加载仪表盘失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const statItems = [
        { key: 'total', title: '总任务', icon: <AppstoreOutlined />, color: '#6366f1' },
        { key: 'completed', title: '已完成', icon: <CheckCircleOutlined />, color: '#22c55e' },
        { key: 'running', title: '进行中', icon: <PlayCircleOutlined />, color: '#f59e0b' },
        { key: 'failed', title: '失败', icon: <CloseCircleOutlined />, color: '#ef4444' },
    ];

    // 饼图数据
    const pieData = [
        { type: '已完成', value: stats.completed },
        { type: '进行中', value: stats.running },
        { type: '失败', value: stats.failed },
        { type: '等待中', value: stats.pending },
    ].filter(d => d.value > 0);

    // 趋势图状态名映射
    const statusNameMap = { completed: '已完成', running: '进行中', failed: '失败', pending: '等待中' };
    const trendData = trend.map(d => ({
        ...d,
        statusName: statusNameMap[d.status] || d.status,
    }));

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin size="large" tip="加载中..." />
            </div>
        );
    }

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

            {/* 图表区域 */}
            <Row gutter={24} style={{ marginBottom: 24 }}>
                <Col span={16}>
                    <Card
                        title={<Space><RiseOutlined />近 7 天采集趋势</Space>}
                        style={{ height: '100%' }}
                    >
                        {trendData.length > 0 ? (
                            <Line
                                data={trendData}
                                xField="date"
                                yField="count"
                                seriesField="statusName"
                                color={['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']}
                                smooth
                                point={{ size: 4 }}
                                height={280}
                                yAxis={{ label: { formatter: (v) => `${v}` } }}
                                legend={{ position: 'top' }}
                                animation={{ appear: { animation: 'wave-in' } }}
                            />
                        ) : (
                            <Empty description="暂无趋势数据" style={{ padding: '60px 0' }} />
                        )}
                    </Card>
                </Col>
                <Col span={8}>
                    <Card
                        title={<Space><CheckCircleOutlined />任务状态分布</Space>}
                        style={{ height: '100%' }}
                    >
                        {pieData.length > 0 ? (
                            <Pie
                                data={pieData}
                                angleField="value"
                                colorField="type"
                                color={['#22c55e', '#f59e0b', '#ef4444', '#94a3b8']}
                                radius={0.85}
                                innerRadius={0.6}
                                height={280}
                                label={{ type: 'inner', offset: '-30%', style: { fontSize: 14, fill: '#fff' } }}
                                legend={{ position: 'bottom' }}
                                statistic={{
                                    title: { style: { color: '#e2e8f0', fontSize: 14 }, content: '总计' },
                                    content: { style: { color: '#fff', fontSize: 28 }, content: `${stats.total}` },
                                }}
                            />
                        ) : (
                            <Empty description="暂无数据" style={{ padding: '60px 0' }} />
                        )}
                    </Card>
                </Col>
            </Row>

            {/* 最近活动 */}
            <Card title="最近活动">
                {activity.length > 0 ? (
                    <Timeline
                        items={activity.map((item) => {
                            const cfg = statusConfig[item.status] || { text: item.status, color: '#94a3b8' };
                            return {
                                key: item.id,
                                color: cfg.color,
                                children: (
                                    <div>
                                        <Space>
                                            <Tag color={cfg.color === '#22c55e' ? 'success' : cfg.color === '#ef4444' ? 'error' : cfg.color === '#f59e0b' ? 'processing' : 'default'}>
                                                {cfg.text}
                                            </Tag>
                                            <Text strong>{item.game_name || `App ${item.app_id}`}</Text>
                                            {item.post_id && <Text type="secondary">→ WP #{item.post_id}</Text>}
                                        </Space>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {item.updated_at ? new Date(item.updated_at).toLocaleString('zh-CN') : ''}
                                            </Text>
                                        </div>
                                    </div>
                                ),
                            };
                        })}
                    />
                ) : (
                    <Empty description="暂无活动记录" />
                )}
            </Card>
        </div>
    );
}
