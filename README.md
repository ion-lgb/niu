# 🎮 Steam Collector

> Steam 游戏数据采集 → AI 改写 → WordPress 自动发布

## 功能

- **Steam 搜索** — 关键词搜索游戏，获取详情 / 截图 / 价格
- **AI 处理** — 自动分类、标签、SEO 生成、内容改写（DeepSeek / OpenAI）
- **自动发布** — 图片迁移 + Gutenberg 格式文章 + B2 主题 SEO
- **队列管理** — 手动确认采集、批量操作、并发处理（可配置）
- **去重检测** — version_hash 防止重复采集

## 采集流程

```
搜索游戏 → 加入队列(waiting) → 手动确认(pending) → Worker 消费
                                                      ↓
SteamFetch → DuplicateCheck → AIAnalyze → AIRewrite → ImageDownload → ContentBuild → PostPublish
```

## 部署

### Docker（推荐）

```bash
# 1. 配置
cd backend
cp .env.example .env
# 编辑 .env 填写必填项

# 2. 启动
cd ..
docker compose up -d

# 3. 查看日志
docker compose logs -f
```

启动后：前端 `3000`，后端 `8000`。

### 必填环境变量

```bash
SC_AUTH_PASSWORD=登录密码
SC_JWT_SECRET=JWT密钥(≥32字符)
SC_AI_API_KEY=sk-xxx
SC_WP_URL=https://your-site.com
SC_WP_USERNAME=admin
SC_WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

其余配置可在前端「系统设置」页面修改。

### WordPress 端

在 B2 主题 `functions.php` 中添加，允许 REST API 写入 SEO 字段：

```php
add_action('init', function() {
    foreach (['zrz_seo_title', 'zrz_seo_keywords', 'zrz_seo_description'] as $key) {
        register_post_meta('post', $key, [
            'show_in_rest'  => true,
            'single'        => true,
            'type'          => 'string',
            'auth_callback' => fn() => current_user_can('edit_posts'),
        ]);
    }
});
```

## 技术栈

**后端**：[FastAPI](https://github.com/fastapi/fastapi) · [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy) · [Pydantic](https://github.com/pydantic/pydantic) · [httpx](https://github.com/encode/httpx) · [aiosqlite](https://github.com/omnilib/aiosqlite)

**前端**：[React](https://github.com/facebook/react) · [Vite](https://github.com/vitejs/vite) · [Ant Design Pro](https://github.com/ant-design/pro-components) · [Axios](https://github.com/axios/axios)

---

v1.1.0 — 2026.02.27
