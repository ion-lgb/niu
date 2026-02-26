import { useState, useCallback } from 'react';
import {
    Search, Loader2, Download, Eye, Send,
    Tag, FileText, Sparkles, ChevronDown, ChevronUp,
    ExternalLink, X,
} from 'lucide-react';
import { searchGames, previewGame, collectGame } from '../api';

function CollectPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState(null);
    const [options, setOptions] = useState({
        enable_rewrite: true,
        enable_analyze: true,
        rewrite_style: 'resource_site',
        post_status: 'draft',
    });
    const [showOptions, setShowOptions] = useState(false);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setSearching(true);
        setResults([]);
        setSelectedGame(null);
        setPreview(null);
        setPublishResult(null);
        try {
            const res = await searchGames(query.trim());
            setResults(res.data.items || []);
        } catch (err) {
            console.error('搜索失败:', err);
        } finally {
            setSearching(false);
        }
    }, [query]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleSelectGame = (game) => {
        setSelectedGame(game);
        setPreview(null);
        setPublishResult(null);
    };

    const handlePreview = async () => {
        if (!selectedGame) return;
        setPreviewing(true);
        setPreview(null);
        try {
            const res = await previewGame({
                app_id: selectedGame.id,
                ...options,
            });
            setPreview(res.data);
        } catch (err) {
            console.error('预览失败:', err);
        } finally {
            setPreviewing(false);
        }
    };

    const handlePublish = async () => {
        if (!selectedGame) return;
        setPublishing(true);
        setPublishResult(null);
        try {
            const res = await collectGame({
                app_id: selectedGame.id,
                ...options,
            });
            setPublishResult(res.data);
        } catch (err) {
            console.error('发布失败:', err);
            setPublishResult({ error: err.message });
        } finally {
            setPublishing(false);
        }
    };

    const formatPrice = (price) => {
        if (!price) return '免费';
        const val = price.final / 100;
        return `¥${val.toFixed(2)}`;
    };

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">游戏采集</h1>
                <p className="page-subtitle">搜索 Steam 游戏，AI 改写后发布到 WordPress</p>
            </div>

            <div className="page-body">
                {/* Search Bar */}
                <div className="search-box" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <Search className="search-icon" />
                    <input
                        className="form-input"
                        type="text"
                        placeholder="输入游戏名称搜索 Steam..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="搜索游戏"
                    />
                </div>

                <div className="btn-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSearch}
                        disabled={searching || !query.trim()}
                    >
                        {searching ? <Loader2 className="spinner" size={18} /> : <Search size={18} />}
                        {searching ? '搜索中...' : '搜索'}
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowOptions(!showOptions)}
                    >
                        {showOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        采集选项
                    </button>
                </div>

                {/* Options Panel */}
                {showOptions && (
                    <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <div className="card-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="rewrite_style">改写风格</label>
                                    <select
                                        id="rewrite_style"
                                        className="form-select"
                                        value={options.rewrite_style}
                                        onChange={(e) => setOptions({ ...options, rewrite_style: e.target.value })}
                                    >
                                        <option value="resource_site">资源站推荐</option>
                                        <option value="review">游戏评测</option>
                                        <option value="seo_heavy">SEO 优化</option>
                                        <option value="brief">简短概述</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="post_status">发布状态</label>
                                    <select
                                        id="post_status"
                                        className="form-select"
                                        value={options.post_status}
                                        onChange={(e) => setOptions({ ...options, post_status: e.target.value })}
                                    >
                                        <option value="draft">草稿</option>
                                        <option value="publish">立即发布</option>
                                        <option value="pending">待审核</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <label className="form-check">
                                    <input
                                        type="checkbox"
                                        checked={options.enable_rewrite}
                                        onChange={(e) => setOptions({ ...options, enable_rewrite: e.target.checked })}
                                    />
                                    <span>启用 AI 改写</span>
                                </label>
                                <label className="form-check">
                                    <input
                                        type="checkbox"
                                        checked={options.enable_analyze}
                                        onChange={(e) => setOptions({ ...options, enable_analyze: e.target.checked })}
                                    />
                                    <span>启用 AI 分析（分类 + 标签 + SEO）</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Results */}
                {results.length > 0 && (
                    <>
                        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            找到 {results.length} 个结果
                        </h3>
                        <div className="results-grid">
                            {results.map((game) => (
                                <div
                                    key={game.id}
                                    className="game-card"
                                    onClick={() => handleSelectGame(game)}
                                    style={{
                                        borderColor: selectedGame?.id === game.id ? 'var(--accent-primary)' : undefined,
                                        boxShadow: selectedGame?.id === game.id ? 'var(--accent-glow)' : undefined,
                                    }}
                                >
                                    <img
                                        className="game-card-image"
                                        src={game.tiny_image}
                                        alt={game.name}
                                        loading="lazy"
                                    />
                                    <div className="game-card-body">
                                        <div className="game-card-title">{game.name}</div>
                                        <div className="game-card-meta">
                                            <span className="game-card-price">{formatPrice(game.price)}</span>
                                            <span>·</span>
                                            <span>ID: {game.id}</span>
                                            {game.metascore && (
                                                <>
                                                    <span>·</span>
                                                    <span className="badge badge-success">{game.metascore}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Searching Empty State */}
                {!searching && results.length === 0 && query && (
                    <div className="empty-state">
                        <Search />
                        <p>未找到匹配的游戏</p>
                    </div>
                )}

                {/* Selected Game Actions */}
                {selectedGame && (
                    <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
                        <div className="card-header">
                            <div>
                                <span className="card-title">{selectedGame.name}</span>
                                <span style={{ marginLeft: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                    App ID: {selectedGame.id}
                                </span>
                            </div>
                            <div className="btn-group">
                                <a
                                    href={`https://store.steampowered.com/app/${selectedGame.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost btn-sm"
                                >
                                    <ExternalLink size={14} /> Steam 页面
                                </a>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={handlePreview}
                                    disabled={previewing}
                                >
                                    {previewing ? <Loader2 className="spinner" size={14} /> : <Eye size={14} />}
                                    {previewing ? '预览中...' : '预览'}
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={handlePublish}
                                    disabled={publishing}
                                >
                                    {publishing ? <Loader2 className="spinner" size={14} /> : <Send size={14} />}
                                    {publishing ? '发布中...' : '发布到 WordPress'}
                                </button>
                            </div>
                        </div>

                        {/* Preview Content */}
                        {preview && (
                            <div className="card-body">
                                {preview.seo && (
                                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                                            <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            SEO 数据
                                        </h4>
                                        <div className="card" style={{ background: 'var(--bg-input)' }}>
                                            <div className="card-body" style={{ fontSize: 'var(--font-size-sm)' }}>
                                                <p><strong>标题:</strong> {preview.seo.title}</p>
                                                <p><strong>描述:</strong> {preview.seo.description}</p>
                                                <p><strong>关键词:</strong> {preview.seo.keywords}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {preview.tags && preview.tags.length > 0 && (
                                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                                            <Tag size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            标签
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                            {preview.tags.map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {preview.rewritten_content && (
                                    <div>
                                        <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                                            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                            AI 改写内容
                                        </h4>
                                        <div className="preview-content">
                                            {preview.rewritten_content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Publish Result */}
                        {publishResult && (
                            <div className="card-body" style={{ borderTop: '1px solid var(--border-default)' }}>
                                {publishResult.error ? (
                                    <div className="toast-error" style={{ position: 'static', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                                        <X size={16} /> 发布失败: {publishResult.error}
                                    </div>
                                ) : (
                                    <div className="toast-success" style={{ position: 'static', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)' }}>
                                        <Download size={16} />
                                        发布成功！动作: {publishResult.action}
                                        {publishResult.post_id && ` | 文章 ID: ${publishResult.post_id}`}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default CollectPage;
