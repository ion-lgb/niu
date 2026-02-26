# 🎮 Steam Collector

> Steam 游戏数据自动采集 → AI 改写 → WordPress 发布系统

一键从 Steam 抓取游戏信息，通过 AI 自动生成资源站风格文章，包含 SEO 优化、图片迁移、B2 主题适配，最终发布为 WordPress 草稿/文章。

## ✨ 功能亮点

- 🔍 **Steam 搜索** — 按关键词搜索游戏，自动获取详情、截图、价格
- 🤖 **AI 智能处理** — DeepSeek/OpenAI 自动分类、打标签、生成 SEO、改写描述
- 📸 **图片自动迁移** — 并发下载 Steam 截图并上传到 WordPress 媒体库（含去重）
- 📝 **Gutenberg 内容** — 自动构建 WordPress 块编辑器格式的文章内容
- 🏷️ **B2 主题 SEO** — 自动写入 B2 主题的 SEO 标题/关键词/描述字段
- 🔄 **重复检测** — 通过 version_hash 检测内容变化，避免重复采集
- 📊 **采集记录** — SQLite 数据库记录每次采集状态，前端实时展示
- ⚡ **任务队列** — ARQ + Redis 异步任务处理（无 Redis 自动降级为同步）

## 📁 项目结构

```
niu/
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口 + 路由注册
│   │   ├── config.py           # 环境变量配置
│   │   ├── core/               # Pipeline 引擎 + Context + 事件总线
│   │   ├── processors/         # 7 个 Pipeline 处理器
│   │   │   ├── steam_fetch.py      # Steam API 数据获取
│   │   │   ├── duplicate_check.py  # 数据库去重检测
│   │   │   ├── ai_analyze.py       # AI 分类 + 标签 + SEO
│   │   │   ├── ai_rewrite.py       # AI 内容改写
│   │   │   ├── image_download.py   # 图片下载 + WP 上传
│   │   │   ├── content_build.py    # Gutenberg 块构建
│   │   │   └── post_publish.py     # WordPress 发布 + B2 SEO
│   │   ├── ai/                 # LiteLLM AI 客户端
│   │   ├── steam/              # Steam Web API 封装
│   │   ├── wordpress/          # WP REST API + B2 SEO 写入
│   │   ├── db/                 # SQLAlchemy 异步数据库层
│   │   ├── queue/              # ARQ 任务队列管理
│   │   ├── api/                # FastAPI 路由
│   │   └── extensions/         # B2 主题扩展
│   ├── pyproject.toml
│   ├── .env.example
│   └── collector.db            # SQLite 数据库（运行时生成）
├── frontend/                   # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx             # 路由 + 侧边栏布局
│   │   ├── api.js              # Axios API 封装
│   │   ├── index.css           # 暗色游戏主题设计系统
│   │   └── pages/
│   │       ├── CollectPage.jsx     # 搜索 + 预览 + 发布
│   │       ├── QueuePage.jsx       # 采集队列 + 统计
│   │       └── SettingsPage.jsx    # 系统设置 + 连接测试
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## 🚀 快速开始

### 前置要求

- **Python** ≥ 3.9
- **Node.js** ≥ 18
- **WordPress** 站点（需开启 REST API + 应用密码）
- **AI API Key**（DeepSeek / OpenAI / 其他 LiteLLM 兼容服务）
- **Redis**（可选，用于异步任务队列）

### 1. 后端配置

```bash
cd backend

# 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -e .

# 配置环境变量
cp .env.example .env
```

编辑 `.env` 填写真实凭据：

```bash
# AI 配置
SC_AI_PROVIDER=deepseek
SC_AI_MODEL=deepseek-chat
SC_AI_API_KEY=sk-your-key-here

# WordPress 配置
SC_WP_URL=https://your-site.com
SC_WP_USERNAME=admin
SC_WP_APP_PASSWORD=xxxx xxxx xxxx xxxx

# 可选配置
SC_REDIS_URL=redis://localhost:6379
SC_DEFAULT_POST_STATUS=draft
SC_ENABLE_AI_REWRITE=true
SC_ENABLE_AI_ANALYZE=true
SC_REWRITE_STYLE=resource_site
```

### 2. WordPress 端配置

在主题的 `functions.php` 中添加以下代码，允许 REST API 写入 B2 SEO 字段：

```php
add_action('init', function() {
    $meta_keys = ['zrz_seo_title', 'zrz_seo_keywords', 'zrz_seo_description'];
    foreach ($meta_keys as $key) {
        register_post_meta('post', $key, [
            'show_in_rest' => true,
            'single'       => true,
            'type'         => 'string',
            'auth_callback' => function() {
                return current_user_can('edit_posts');
            },
        ]);
    }
});
```

### 3. 启动服务

```bash
# 终端 1：启动后端（自动创建 SQLite 数据库）
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000

# 终端 2：启动前端
cd frontend
npm install
npm run dev
```

访问 **http://localhost:3000** 即可使用。

### 4. ARQ Worker（可选）

如果安装了 Redis，可以启用异步任务队列：

```bash
cd backend
arq app.queue.manager.WorkerSettings
```

> 没有 Redis 也能正常工作，系统会自动降级为同步执行。

## 🔧 采集流程

```
搜索游戏 → SteamFetch → DuplicateCheck → AIAnalyze → AIRewrite
                                                         ↓
                     WordPress 草稿 ← PostPublish ← ContentBuild ← ImageDownload
```

| 步骤 | 处理器 | 功能 |
|------|--------|------|
| 1 | SteamFetch | 调用 Steam API 获取游戏详情 |
| 2 | DuplicateCheck | version_hash 查询数据库，避免重复采集 |
| 3 | AIAnalyze | AI 自动分类、生成标签和 SEO 元数据 |
| 4 | AIRewrite | AI 改写游戏描述为资源站风格 |
| 5 | ImageDownload | 并发下载截图并上传 WP 媒体库 |
| 6 | ContentBuild | 构建 Gutenberg 块格式文章 |
| 7 | PostPublish | 创建 WP 文章 + 写入 B2 SEO 字段 |

## 🌐 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/steam/search?q=` | Steam 游戏搜索 |
| GET | `/api/steam/details/{app_id}` | 游戏详情 |
| POST | `/api/collect` | 采集并发布单个游戏 |
| POST | `/api/collect/preview` | 预览采集结果（不发布） |
| GET | `/api/history/records/stats` | 采集统计数据 |
| GET | `/api/history/records` | 采集记录列表 |
| GET | `/api/history/records/{id}` | 单条记录详情 |
| POST | `/api/queue/enqueue` | 异步入队单个任务 |
| POST | `/api/queue/enqueue/batch` | 批量入队 |
| GET | `/api/settings` | 读取配置 |
| POST | `/api/settings/test-wp` | 测试 WordPress 连接 |
| POST | `/api/settings/test-ai` | 测试 AI 连接 |

## ⚙️ 环境变量

所有环境变量以 `SC_` 前缀开头：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SC_AI_PROVIDER` | `deepseek` | AI 服务商 |
| `SC_AI_MODEL` | `deepseek-chat` | 模型名称 |
| `SC_AI_API_KEY` | — | API 密钥（**必填**） |
| `SC_AI_BASE_URL` | — | 自定义 API 端点 |
| `SC_WP_URL` | — | WordPress 站点 URL（**必填**） |
| `SC_WP_USERNAME` | — | WordPress 用户名（**必填**） |
| `SC_WP_APP_PASSWORD` | — | WordPress 应用密码（**必填**） |
| `SC_REDIS_URL` | `redis://localhost:6379` | Redis 连接地址 |
| `SC_DATABASE_URL` | `sqlite+aiosqlite:///./collector.db` | 数据库连接 |
| `SC_DEFAULT_POST_STATUS` | `draft` | 默认发布状态 |
| `SC_ENABLE_AI_REWRITE` | `true` | 启用 AI 改写 |
| `SC_ENABLE_AI_ANALYZE` | `true` | 启用 AI 分析 |
| `SC_REWRITE_STYLE` | `resource_site` | 改写风格 |
| `SC_MAX_IMAGE_CONCURRENCY` | `5` | 图片并发下载数 |
| `SC_IMAGE_DOWNLOAD_TIMEOUT` | `30` | 图片下载超时（秒） |
| `SC_STEAM_REQUEST_DELAY` | `3.0` | Steam API 请求间隔 |

## 🛠️ 技术栈

**后端**：FastAPI · SQLAlchemy · LiteLLM · ARQ · httpx · Pydantic

**前端**：React · Vite · React Router · Axios · Lucide Icons

**外部服务**：Steam Web API · WordPress REST API · DeepSeek/OpenAI · Redis

---

## 📋 版本

**v1.0.0** — 2026.02.26

## 👥 作者

**ion** · **Claude Opus** · **Gemini**
