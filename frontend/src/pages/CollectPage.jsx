import { useState, useCallback } from 'react';
import {
    Input, Button, Card, Row, Col, Space, Tag, Typography, Alert, Spin, Empty,
    Select, Checkbox, Collapse, Descriptions, message, Affix,
} from 'antd';
import {
    SearchOutlined, EyeOutlined, SendOutlined, SettingOutlined,
    LinkOutlined, TagsOutlined, FileTextOutlined, ThunderboltOutlined,
    CheckSquareOutlined,
} from '@ant-design/icons';
import { searchGames, previewGame, collectGame, enqueueBatch } from '../api';

const { Text, Title } = Typography;

function CollectPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState(null);

    // 批量选择
    const [selectedIds, setSelectedIds] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);

    const [options, setOptions] = useState({
        enable_rewrite: true,
        enable_analyze: true,
        rewrite_style: 'resource_site',
        post_status: 'draft',
    });

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setSearching(true);
        setResults([]);
        setSelectedGame(null);
        setPreview(null);
        setPublishResult(null);
        setSelectedIds([]);
        try {
            const res = await searchGames(query.trim());
            setResults(res.data.items || []);
        } catch (err) {
            console.error('搜索失败:', err);
        } finally {
            setSearching(false);
        }
    }, [query]);

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
            const res = await previewGame({ app_id: selectedGame.id, ...options });
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
            const res = await collectGame({ app_id: selectedGame.id, ...options });
            setPublishResult(res.data);
        } catch (err) {
            console.error('发布失败:', err);
            setPublishResult({ error: err.message });
        } finally {
            setPublishing(false);
        }
    };

    // 批量入队
    const handleBatchEnqueue = async () => {
        if (selectedIds.length === 0) return;
        setBatchLoading(true);
        try {
            const res = await enqueueBatch({ app_ids: selectedIds, options });
            message.success(`已将 ${res.data.count} 个游戏加入采集队列`);
            setSelectedIds([]);
        } catch (err) {
            message.error('批量入队失败: ' + (err.response?.data?.detail || err.message));
        } finally {
            setBatchLoading(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === results.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(results.map((g) => g.id));
        }
    };

    const formatPrice = (price) => {
        if (!price) return '免费';
        const val = price.final / 100;
        return `¥${val.toFixed(2)}`;
    };

    const optionsPanel = [
        {
            key: 'options',
            label: (
                <span><SettingOutlined style={{ marginRight: 8 }} />采集选项</span>
            ),
            children: (
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>改写风格</Text>
                        </div>
                        <Select
                            style={{ width: '100%' }}
                            value={options.rewrite_style}
                            onChange={(v) => setOptions({ ...options, rewrite_style: v })}
                            options={[
                                { value: 'resource_site', label: '资源站推荐' },
                                { value: 'review', label: '游戏评测' },
                                { value: 'seo_heavy', label: 'SEO 优化' },
                                { value: 'brief', label: '简短概述' },
                            ]}
                        />
                    </Col>
                    <Col span={12}>
                        <div style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>发布状态</Text>
                        </div>
                        <Select
                            style={{ width: '100%' }}
                            value={options.post_status}
                            onChange={(v) => setOptions({ ...options, post_status: v })}
                            options={[
                                { value: 'draft', label: '草稿' },
                                { value: 'publish', label: '立即发布' },
                                { value: 'pending', label: '待审核' },
                            ]}
                        />
                    </Col>
                    <Col span={24}>
                        <Space size="large">
                            <Checkbox
                                checked={options.enable_rewrite}
                                onChange={(e) => setOptions({ ...options, enable_rewrite: e.target.checked })}
                            >
                                启用 AI 改写
                            </Checkbox>
                            <Checkbox
                                checked={options.enable_analyze}
                                onChange={(e) => setOptions({ ...options, enable_analyze: e.target.checked })}
                            >
                                启用 AI 分析（分类 + 标签 + SEO）
                            </Checkbox>
                        </Space>
                    </Col>
                </Row>
            ),
        },
    ];

    return (
        <div>
            {/* 搜索区域 */}
            <Card style={{ marginBottom: 24 }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        size="large"
                        placeholder="输入游戏名称搜索 Steam..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onPressEnter={handleSearch}
                        prefix={<SearchOutlined />}
                        allowClear
                    />
                    <Button
                        type="primary"
                        size="large"
                        icon={<SearchOutlined />}
                        loading={searching}
                        onClick={handleSearch}
                        disabled={!query.trim()}
                    >
                        搜索
                    </Button>
                </Space.Compact>

                <Collapse
                    ghost
                    items={optionsPanel}
                    style={{ marginTop: 16 }}
                />
            </Card>

            {/* 搜索中 */}
            {searching && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Spin size="large" tip="搜索中..." />
                </div>
            )}

            {/* 搜索结果 */}
            {!searching && results.length > 0 && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text type="secondary">找到 {results.length} 个结果</Text>
                        <Space>
                            <Checkbox
                                checked={selectedIds.length === results.length && results.length > 0}
                                indeterminate={selectedIds.length > 0 && selectedIds.length < results.length}
                                onChange={toggleSelectAll}
                            >
                                全选
                            </Checkbox>
                        </Space>
                    </div>
                    <Row gutter={[16, 16]}>
                        {results.map((game) => (
                            <Col key={game.id} xs={24} sm={12} md={8} lg={6}>
                                <Card
                                    hoverable
                                    size="small"
                                    style={{
                                        borderColor: selectedGame?.id === game.id ? '#6366f1' : selectedIds.includes(game.id) ? '#6366f180' : undefined,
                                        boxShadow: selectedGame?.id === game.id ? '0 0 12px rgba(99, 102, 241, 0.3)' : undefined,
                                    }}
                                    cover={
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                alt={game.name}
                                                src={game.tiny_image}
                                                style={{ width: '100%', aspectRatio: '460/215', objectFit: 'cover', cursor: 'pointer' }}
                                                onClick={() => handleSelectGame(game)}
                                            />
                                            <Checkbox
                                                checked={selectedIds.includes(game.id)}
                                                onChange={() => toggleSelect(game.id)}
                                                style={{
                                                    position: 'absolute', top: 8, left: 8,
                                                }}
                                            />
                                        </div>
                                    }
                                >
                                    <div onClick={() => handleSelectGame(game)} style={{ cursor: 'pointer' }}>
                                        <Card.Meta
                                            title={<Text ellipsis style={{ fontSize: 14 }}>{game.name}</Text>}
                                            description={
                                                <Space size={4} wrap>
                                                    <Text style={{ color: '#66c0f4', fontWeight: 600, fontSize: 13 }}>
                                                        {formatPrice(game.price)}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>ID: {game.id}</Text>
                                                    {game.metascore && (
                                                        <Tag color="green" style={{ fontSize: 11 }}>{game.metascore}</Tag>
                                                    )}
                                                </Space>
                                            }
                                        />
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            {/* 无结果 */}
            {!searching && results.length === 0 && query && (
                <Empty description="未找到匹配的游戏" style={{ padding: '60px 0' }} />
            )}

            {/* 批量操作栏 */}
            {selectedIds.length > 0 && (
                <Affix offsetBottom={24}>
                    <Card
                        size="small"
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <CheckSquareOutlined style={{ color: '#6366f1' }} />
                                <Text strong>已选 {selectedIds.length} 个游戏</Text>
                                <Button type="link" size="small" onClick={() => setSelectedIds([])}>
                                    清除选择
                                </Button>
                            </Space>
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={batchLoading}
                                onClick={handleBatchEnqueue}
                            >
                                批量加入采集队列
                            </Button>
                        </div>
                    </Card>
                </Affix>
            )}

            {/* 选中游戏操作区 */}
            {selectedGame && (
                <Card
                    title={
                        <Space>
                            <span>{selectedGame.name}</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>App ID: {selectedGame.id}</Text>
                        </Space>
                    }
                    extra={
                        <Space>
                            <Button
                                size="small"
                                icon={<LinkOutlined />}
                                href={`https://store.steampowered.com/app/${selectedGame.id}`}
                                target="_blank"
                            >
                                Steam 页面
                            </Button>
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={handlePreview}
                                loading={previewing}
                            >
                                预览
                            </Button>
                            <Button
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handlePublish}
                                loading={publishing}
                            >
                                发布到 WordPress
                            </Button>
                        </Space>
                    }
                    style={{ marginTop: 24 }}
                >
                    {/* 预览内容 */}
                    {preview && (
                        <div>
                            {preview.seo && (
                                <div style={{ marginBottom: 24 }}>
                                    <Title level={5}>
                                        <FileTextOutlined style={{ marginRight: 8 }} />
                                        SEO 数据
                                    </Title>
                                    <Descriptions
                                        column={1}
                                        size="small"
                                        items={[
                                            { key: 'title', label: '标题', children: preview.seo.title },
                                            { key: 'desc', label: '描述', children: preview.seo.description },
                                            { key: 'kw', label: '关键词', children: preview.seo.keywords },
                                        ]}
                                    />
                                </div>
                            )}

                            {preview.tags?.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <Title level={5}>
                                        <TagsOutlined style={{ marginRight: 8 }} />
                                        标签
                                    </Title>
                                    <Space size={[4, 8]} wrap>
                                        {preview.tags.map((tag, i) => (
                                            <Tag key={i} color="purple">{tag}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            )}

                            {preview.rewritten_content && (
                                <div>
                                    <Title level={5}>
                                        <ThunderboltOutlined style={{ marginRight: 8 }} />
                                        AI 改写内容
                                    </Title>
                                    <div style={{
                                        maxHeight: 400, overflowY: 'auto', padding: 16,
                                        background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                                        fontSize: 14, lineHeight: 1.8,
                                    }}>
                                        {preview.rewritten_content}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 发布结果 */}
                    {publishResult && (
                        <div style={{ marginTop: 16 }}>
                            {publishResult.error ? (
                                <Alert type="error" showIcon message="发布失败" description={publishResult.error} />
                            ) : (
                                <Alert
                                    type="success"
                                    showIcon
                                    message="发布成功"
                                    description={`动作: ${publishResult.action}${publishResult.post_id ? ` | 文章 ID: ${publishResult.post_id}` : ''}`}
                                />
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

export default CollectPage;
