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
        { key: 'total', label: '总任务', color: 'var(--accent-primary)', icon: ListChecks },
        { key: 'completed', label: '已完成', color: 'var(--status-success)', icon: CheckCircle2 },
        { key: 'running', label: '进行中', color: 'var(--status-warning)', icon: Play },
        { key: 'failed', label: '失败', color: 'var(--status-error)', icon: XCircle },
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
            <div className="stats-row">
                {statCards.map((c) => {
                    const Icon = c.icon;
                    return (
                        <div key={c.key} className="card stat-card">
                            <div className="stat-content">
                                <div className="stat-label">{c.label}</div>
                                <div className="stat-value-container">
                                    <div className="stat-value">{stats[c.key]}</div>
                                </div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ background: c.color }}>
                                <Icon size={24} color="#fff" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 过滤标签 */}
            <div className="tabs" style={{ marginTop: '1.5rem' }}>
                {Object.entries(STATUS_MAP).map(([key, { label, icon: Icon }]) => (
                    <button
                        key={key}
                        className={`tab ${filter === key ? 'active' : ''}`}
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
                <div className="table-container" style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
                    <table style={{ minWidth: '800px' }}>
                        <colgroup>
                            <col style={{ width: '120px' }} />
                            <col style={{ width: 'auto' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '180px' }} />
                            <col style={{ width: '100px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>App ID</th>
                                <th>游戏名称</th>
                                <th>任务类型</th>
                                <th>状态</th>
                                <th>WP 文章</th>
                                <th>创建时间</th>
                                <th style={{ textAlign: 'center' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id}>
                                    <td><code>{r.app_id}</code></td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{r.game_name || '-'}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-neutral">
                                            {r.action === 'create' ? '发布文章' : r.action === 'update' ? '更新数据' : r.action}
                                        </span>
                                    </td>
                                    <td>{statusBadge(r.status)}</td>
                                    <td>{r.post_id ? <a href="#" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>#{r.post_id}</a> : '-'}</td>
                                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            {r.status === 'failed' && (
                                                <button className="btn btn-sm btn-secondary" title="重试"><RotateCcw size={14} /></button>
                                            )}
                                            <button className="btn btn-sm btn-ghost" title="删除" style={{ color: 'var(--status-error)' }}>
                                                <Trash2 size={16} />
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
