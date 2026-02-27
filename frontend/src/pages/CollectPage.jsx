import { useState, useCallback } from 'react';
import {
    Input, Button, Card, Row, Col, Space, Tag, Typography, Alert, Spin, Empty,
    Select, Checkbox, Collapse, Descriptions, Affix, Modal, Carousel, App,
} from 'antd';
import {
    SearchOutlined, EyeOutlined, SendOutlined, SettingOutlined,
    LinkOutlined, TagsOutlined, FileTextOutlined, ThunderboltOutlined,
    CheckSquareOutlined, CalendarOutlined, TeamOutlined, StarOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { searchGames, previewGame, collectGame, enqueueBatch, getGameDetails } from '../api';

const { Text, Title } = Typography;

function CollectPage() {
    const { message } = App.useApp();
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

    // 游戏详情 Modal
    const [detailModal, setDetailModal] = useState(false);
    const [gameDetail, setGameDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

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

    const handleSelectGame = async (game) => {
        setSelectedGame(game);
        setPreview(null);
        setPublishResult(null);

        // 打开详情 Modal
        setDetailModal(true);
        setDetailLoading(true);
        setGameDetail(null);
        try {
            const res = await getGameDetails(game.id);
            setGameDetail(res.data);
        } catch (err) {
            message.error('获取游戏详情失败');
        } finally {
            setDetailLoading(false);
        }
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

            {/* ===== 游戏详情 Modal ===== */}
            <Modal
                open={detailModal}
                onCancel={() => setDetailModal(false)}
                width={800}
                title={gameDetail?.name || selectedGame?.name || '游戏详情'}
                footer={
                    <Space>
                        <Button
                            icon={<LinkOutlined />}
                            href={`https://store.steampowered.com/app/${selectedGame?.id}`}
                            target="_blank"
                        >
                            Steam 页面
                        </Button>
                        <Button
                            icon={<EyeOutlined />}
                            onClick={handlePreview}
                            loading={previewing}
                        >
                            预览
                        </Button>
                        <Button
                            type="primary"
                            icon={<SendOutlined />}
                            onClick={handlePublish}
                            loading={publishing}
                        >
                            发布到 WordPress
                        </Button>
                    </Space>
                }
            >
                {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Spin size="large" tip="加载详情..." />
                    </div>
                ) : gameDetail ? (
                    <div>
                        {/* 截图轮播 */}
                        {gameDetail.screenshots?.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <Carousel autoplay dotPosition="bottom" style={{ borderRadius: 8, overflow: 'hidden' }}>
                                    {gameDetail.screenshots.slice(0, 8).map((s, i) => (
                                        <div key={i}>
                                            <img
                                                src={s.path_full}
                                                alt={`Screenshot ${i + 1}`}
                                                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ))}
                                </Carousel>
                            </div>
                        )}

                        {/* 基本信息 */}
                        <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
                            <Descriptions.Item label={<><TeamOutlined /> 开发商</>}>
                                {gameDetail.developers?.join(', ') || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><TeamOutlined /> 发行商</>}>
                                {gameDetail.publishers?.join(', ') || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><CalendarOutlined /> 发行日期</>}>
                                {gameDetail.release_date?.date || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={<><InfoCircleOutlined /> 类型</>}>
                                <Space size={[4, 4]} wrap>
                                    {gameDetail.genres?.map((g) => (
                                        <Tag key={g.id} color="blue" style={{ fontSize: 11 }}>{g.description}</Tag>
                                    )) || '-'}
                                </Space>
                            </Descriptions.Item>
                            {gameDetail.metacritic && (
                                <Descriptions.Item label={<><StarOutlined /> Metacritic</>} span={2}>
                                    <Space>
                                        <Tag color={gameDetail.metacritic.score >= 75 ? 'green' : gameDetail.metacritic.score >= 50 ? 'orange' : 'red'}>
                                            {gameDetail.metacritic.score} 分
                                        </Tag>
                                        {gameDetail.metacritic.url && (
                                            <a href={gameDetail.metacritic.url} target="_blank" rel="noreferrer" style={{ color: '#818cf8', fontSize: 12 }}>
                                                查看评测
                                            </a>
                                        )}
                                    </Space>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="支持平台" span={2}>
                                <Space>
                                    {gameDetail.platforms?.windows && <Tag>Windows</Tag>}
                                    {gameDetail.platforms?.mac && <Tag>macOS</Tag>}
                                    {gameDetail.platforms?.linux && <Tag>Linux</Tag>}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>

                        {/* 简介 */}
                        {gameDetail.short_description && (
                            <div style={{
                                padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                                fontSize: 14, lineHeight: 1.8, marginBottom: 24,
                            }}>
                                {gameDetail.short_description}
                            </div>
                        )}

                        {/* 预览结果 */}
                        {preview && (
                            <div style={{ marginBottom: 16 }}>
                                <Title level={5}><FileTextOutlined style={{ marginRight: 8 }} />AI 预览结果</Title>
                                {preview.seo && (
                                    <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
                                        <Descriptions.Item label="SEO 标题">{preview.seo.title}</Descriptions.Item>
                                        <Descriptions.Item label="SEO 描述">{preview.seo.description}</Descriptions.Item>
                                    </Descriptions>
                                )}
                                {preview.tags?.length > 0 && (
                                    <Space size={[4, 8]} wrap style={{ marginBottom: 16 }}>
                                        <TagsOutlined />
                                        {preview.tags.map((tag, i) => (
                                            <Tag key={i} color="purple">{tag}</Tag>
                                        ))}
                                    </Space>
                                )}
                            </div>
                        )}

                        {/* 发布结果 */}
                        {publishResult && (
                            <div>
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
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}

export default CollectPage;
