import { useState, useEffect, useCallback } from 'react';
import { ListChecks, CheckCircle2, Play, XCircle, Clock, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { getRecordStats, getRecords } from '../api';

const STATUS_MAP = {
    all: { label: '全部', icon: ListChecks },
    completed: { label: '已完成', icon: CheckCircle2 },
    running: { label: '进行中', icon: Play },
    failed: { label: '失败', icon: XCircle },
    pending: { label: '等待中', icon: Clock },
};

export default function QueuePage() {
    const [stats, setStats] = useState({ total: 0, completed: 0, running: 0, failed: 0, pending: 0 });
    const [records, setRecords] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, recordsRes] = await Promise.all([
                getRecordStats(),
                getRecords(filter === 'all' ? {} : { status: filter }),
            ]);
            setStats(statsRes.data);
            setRecords(recordsRes.data.items);
        } catch (err) {
            console.error('加载队列数据失败:', err);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const statCards = [
        { key: 'total', label: '总任务', color: 'var(--accent-primary)' },
        { key: 'completed', label: '已完成', color: 'var(--status-success)' },
        { key: 'running', label: '进行中', color: 'var(--status-warning)' },
        { key: 'failed', label: '失败', color: 'var(--status-error)' },
    ];

    const statusBadge = (status) => {
        const map = {
            completed: { cls: 'badge-success', text: '已完成' },
            running: { cls: 'badge-warning', text: '进行中' },
            failed: { cls: 'badge-error', text: '失败' },
            pending: { cls: 'badge-info', text: '等待中' },
        };
        const s = map[status] || { cls: '', text: status };
        return <span className={`badge ${s.cls}`}>{s.text}</span>;
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>采集队列</h1>
                <button className="btn btn-secondary" onClick={fetchData} style={{ marginLeft: 'auto' }}>
                    <RefreshCw size={16} /> 刷新
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="stats-grid">
                {statCards.map((c) => (
                    <div key={c.key} className="card stat-card">
                        <div className="stat-value" style={{ color: c.color }}>{stats[c.key]}</div>
                        <div className="stat-label">{c.label}</div>
                    </div>
                ))}
            </div>

            {/* 过滤标签 */}
            <div className="tabs" style={{ marginTop: '1.5rem' }}>
                {Object.entries(STATUS_MAP).map(([key, { label, icon: Icon }]) => (
                    <button
                        key={key}
                        className={`tab ${filter === key ? 'tab-active' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        <Icon size={14} /> {label}
                        {key !== 'all' && <span className="tab-count">{stats[key] ?? 0}</span>}
                    </button>
                ))}
            </div>

            {/* 记录表格 */}
            {loading ? (
                <div className="empty-state"><div className="spinner" /><p>加载中…</p></div>
            ) : records.length === 0 ? (
                <div className="empty-state">
                    <ListChecks size={48} />
                    <p>暂无采集记录</p>
                    <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>在「游戏采集」页面搜索并发布游戏后，记录将显示在这里</p>
                </div>
            ) : (
                <div className="table-container" style={{ marginTop: '1rem' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>App ID</th>
                                <th>游戏名称</th>
                                <th>操作</th>
                                <th>状态</th>
                                <th>WP 文章</th>
                                <th>创建时间</th>
                                <th>动作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id}>
                                    <td><code>{r.app_id}</code></td>
                                    <td>{r.game_name || '-'}</td>
                                    <td>{r.action}</td>
                                    <td>{statusBadge(r.status)}</td>
                                    <td>{r.post_id ? <a href="#" style={{ color: 'var(--accent-primary)' }}>#{r.post_id}</a> : '-'}</td>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', opacity: 0.7 }}>
                                        {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {r.status === 'failed' && (
                                                <button className="btn btn-sm" title="重试"><RotateCcw size={14} /></button>
                                            )}
                                            <button className="btn btn-sm" title="删除" style={{ color: 'var(--status-error)' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
