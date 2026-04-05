# 手册 A：部署、安全、发布与运维

本文档由原 **01 / 04 / 05 / 09 / 16** 合并；下方各节为原文顺序拼接，链接已指向五本**手册**或 **08**。

---

# 部署指南（多系统，面向新手）

本文说明如何在 **仅预览**、**本机开发联调**、**局域网/服务器生产** 等场景下部署三端。默认数据库为 **SQLite 单文件**，可随备份目录复制。

---

## 0.  Prerequisites（先准备什么）

三台「逻辑」服务：

| 服务 | 默认端口 | 作用 |
|------|-----------|------|
| FastAPI | 8000 | 唯一数据源与业务 API |
| 前台 Vite 或静态目录 | 5173（dev）或 Nginx | 用户端站点 |
| Next 管理后台 | 3000（dev）或 Nginx 子路径/子域 | 运营端 |

需要安装：

- **Python 3.10+**（后端）
- **Node.js 20 LTS**（前台与管理端构建）

---

## 1. Windows 部署（PowerShell）

### 1.1 后端

```powershell
cd C:\路径\AI导航\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# 可选：设置密钥与 CORS（生产必改 JWT_SECRET）
$env:JWT_SECRET="请用长随机串"
$env:ALLOWED_ORIGINS="https://你的前台域名,https://你的后台域名"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

数据库文件默认在 `backend/data/app.db`（若无则首次启动会初始化）。

### 1.2 前台开发模式（联调）

另开终端：

```powershell
cd C:\路径\AI导航\frontend
# 可选：复制 .env.example 为 .env，设置 DEV_API_PROXY=http://127.0.0.1:8000
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。`/api` 由 Vite 转发到后端。

### 1.3 管理后台开发模式

```powershell
cd C:\路径\AI导航\admin
# 可选：.env.local 中 API_PROXY_TARGET=http://127.0.0.1:8000
npm install
npm run dev
```

打开 `http://localhost:3000`，使用 `admin@example.com` / `admin123`（首次启动由后端写入）。

### 1.4 Windows 生产思路（简述）

1. 后端：用 **NSSM** 或 **Windows 服务** 将 `uvicorn app.main:app --host 0.0.0.0 --port 8000` 注册为服务；前面可挂 IIS 反向代理。
2. 前台：`npm run build`，产物在 `frontend/dist`，由 **IIS 静态站点** 或 **Nginx for Windows** 托管；构建前设置 `VITE_API_BASE` 为公网 API 地址。
3. 管理端：`npm run build && npm run start`（Node 常驻）或导出 **standalone** 镜像（进阶）。

---

## 2. macOS / Linux（本机与服务器通用）

### 2.1 后端（与 Windows 类似）

```bash
cd /path/AI导航/backend
python3 -m venv .venv
source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
export JWT_SECRET="请用长随机串"
export ALLOWED_ORIGINS="https://www.example.com,https://admin.example.com"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**虚拟环境**：`.venv` 随本机 Python 安装路径生成，**不要**从另一台电脑整块拷贝；换机或出现 `bad interpreter` 时，在 `backend` 下删除 `.venv` 后按上表重建并 `pip install -r requirements.txt`。macOS 上若系统自带的 `python3 -m venv` 报错，可改用已安装的 **Python 3.10+**（例如 Homebrew 的 `python3.11 -m venv .venv`）。

### 2.2 systemd（Linux 常驻示例）

创建 `/etc/systemd/system/ai-hub-api.service`：

```ini
[Unit]
Description=AI Hub FastAPI
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/ai-hub/backend
Environment=JWT_SECRET=你的密钥
Environment=ALLOWED_ORIGINS=https://www.example.com,https://admin.example.com
ExecStart=/srv/ai-hub/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai-hub-api
```

Nginx 将 `https://api.example.com` 反代到 `127.0.0.1:8000`。

---

## 3. Docker（单机 Compose 思路）

可自建 `docker-compose.yml`（项目未内置，可按下列结构添加）：

- **api**：镜像内 `pip install` + `uvicorn`，挂载 `backend/data` 卷持久化 `app.db`。
- **web**：`frontend` 多阶段构建，`nginx:alpine` 提供静态文件，环境变量注入 `VITE_API_BASE`。
- **admin**：`admin` 构建后 `next start` 或单独静态导出（若改配置）。

要点：**同一 Docker 网络** 内，前台 `VITE_API_BASE` 填浏览器可访问的 API 公网地址，不要用容器名（浏览器访问不到）。

---

## 4. 云主机（阿里云 / 腾讯云 / AWS EC2 等）

1. 安全组放行 **80/443**（及可选 **22** SSH）。
2. 安装 **Nginx** + **Certbot** 申请 HTTPS。
3. 三个 server_name：`www`、`admin`、`api` 分别反代到静态目录、Node/Next、uvicorn。
4. 环境变量在 systemd 或 `.env`（自建加载）中配置，**勿将 JWT_SECRET 提交到 Git**。

---

## 5. 构建前检查清单

- [ ] 生产设置 **`ENVIRONMENT=production`**（启用 **`JWT_SECRET` 强校验**，且不再覆盖已存在演示账号的密码哈希；见 `backend/.env.example`）。
- [ ] `JWT_SECRET` 已更换（**至少 24 字符**随机串），且生产 `ALLOWED_ORIGINS` 包含真实前台、后台源。
- [ ] 前台 `VITE_API_BASE` 指向公网 API（**含 https**）。
- [ ] 管理端 `API_PROXY_TARGET` 在「服务端渲染/rewrites」环境下指向内网或本地 API；若管理端与 API 同域反代，可为内网地址。
- [ ] 备份 `backend/data/app.db` 与 `site_json` 等重要内容。
- [ ] （可选）在 **`backend/`** 执行 **`PYTHONPATH=. python scripts/verify_release_env.py`**：生产环境下校验 **JWT** 粗检、**CORS** 警告、**PostgreSQL** 连通（若设 **`DATABASE_URL`**）；见 [21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md](./手册-C-开放事项与演进对照.md) §1。  
- [ ] （可选）对公网 API 执行 **`backend/scripts/publish_smoke.sh`**：`BASE_URL=https://你的API根 ./backend/scripts/publish_smoke.sh`，与 [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §2.3 一致。
- [ ] （可选）启用 **管理端 AI SEO 分析**（**`/admin/ai-seo-insights`**）时：配置 **`AI_INSIGHT_LLM_API_KEY`**（推荐，不入库）或在后台「大模型连接」页填写密钥；依赖 **`httpx`**（见 `backend/requirements.txt`）。说明见 [12-需求-AI-SEO与流量分析助手.md](./手册-D-需求-商业化-AI-SEO-爬虫.md)、[06-API接口参考.md](./手册-B-架构程序与API索引.md)。

---

## 6. 常见问题

**Q：前台登录后刷新能保留吗？**  
A：用户展示信息在 `localStorage` 的 `user`；JWT 在 `access_token`。两端需同源或 CORS 配置正确。

**Q：CORS 报错？**  
A：后端 `ALLOWED_ORIGINS` 必须与浏览器地址栏**完全一致**（协议+域名+端口）。

**Q：管理端 401？**  
A：token 过期（默认 7 天）或用户非 admin；重新登录。

**Q：运行 `uvicorn` 提示 `bad interpreter` 或 `.venv/bin/python` 不存在？**  
A：说明当前 `.venv` 是在别的路径或别的机器上创建的。删除 `backend/.venv` 后在本机按 **§2.1** 重新 `python3 -m venv` 并安装依赖即可。

**Q：`pip` 大量 `Ignoring invalid distribution …`？**  
A：常见于把项目放在 **外置盘**（如 exFAT）时产生的附属元数据；若 `import fastapi`、`uvicorn app.main:app` 正常，一般可忽略。若仍异常，把仓库放在本机 APFS 磁盘上再建 `.venv`。

更多已知限制见 `04-P0安全与联调备忘.md`。


---

# P0 安全与联调备忘

**可执行待办总表**见 [**03-开放事项总表.md**](./手册-C-开放事项与演进对照.md)。本文只保留 **P0 安全摘要**与**联调常错点**，不写已闭环条目。

---

## P0 — 安全（上线前）

**SEC-01**（与待办表同源）：生产须更换默认 **`JWT_SECRET`**（建议 **≥24 字符**）、**演示账号**及**管理员**登录口令；勿将仓库 **`.env.example`** 中的示例值直接用于线上。设置 **`ENVIRONMENT=production`** 时，后端 **`env_guard`** 会拒绝弱/占位 **`JWT_SECRET`** 启动；**`ensure_dev_accounts`** 在生产**不会**把已存在用户的密码重置回 `admin123`/`demo`（首启插入后仍须立即改密）。发布勾选见 [**09-上线发布验收清单.md**](./手册-A-部署安全-发布与运维.md) §4。  
**发布前自检（辅助）**：在 **`backend/`** 执行 **`python scripts/verify_release_env.py`**，生产环境下与启动相同的 **JWT** 粗检（见 [**21**](./手册-C-开放事项与演进对照.md) §1）。

---

## 联调注意点

1. **只起前台、未起 API**：先启动 FastAPI（如 `uvicorn`），见 [**01-部署指南.md**](./手册-A-部署安全-发布与运维.md)。  
2. **生产/预发前端构建**：注入 **`VITE_API_BASE`**、**`VITE_PUBLIC_SITE_URL`**；后端 **`ALLOWED_ORIGINS`** 须与浏览器 **Origin** 完全一致（含协议与端口）。  
3. **本地管理端**：**`API_PROXY_TARGET`** 指向可达的 API 根（见 **`admin/.env.example`**）。  

其它环境变量与 **`DATABASE_URL`**（PostgreSQL）见 [**02-架构与程序说明.md**](./手册-B-架构程序与API索引.md) §5；工程项（**ENG-PG** 等）只在 [**03-开放事项总表.md**](./手册-C-开放事项与演进对照.md) 维护。

---

**相关**：[05-工程优化与运维备忘.md](./手册-A-部署安全-发布与运维.md)（**BACKLOG-A** 已闭、运维备忘）。


---

# 暂缓项与运维备忘

与 [04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md)（联调）互补；**可执行待办总表**见 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md)。

---

## 已关闭（BACKLOG-A，2026-04）

| ID | 说明 |
|----|------|
| **A**（已闭） | 已按「零入边」删除 **`frontend/src/app/components/ui/`** 中未被业务引用的 shadcn 生成文件（自 **48** 减至 **14**：`badge`、`button`、`card`、`dialog`、`dropdown-menu`、`input`、`label`、`progress`、`select`、`sonner`、`switch`、`tabs`、`textarea` 及 **`utils.ts`**）；移除未再使用的 **npm** 依赖（如 **cmdk**、**embla-carousel-react**、**vaul**、**react-day-picker**、**date-fns**、**react-hook-form**、**react-resizable-panels**、**input-otp** 及部分 **@radix-ui/***）。验收：**`npm run build`** 通过。若再用 shadcn CLI 加组件，仍建议只保留有 import 的模块。 |

---

## 运维提醒（`migrate` / 后台编辑）

- **`dashboard`** 等 **`site_json`**：`migrate` 会把种子里的**缺键合并**进现有 JSON（**不覆盖**已有键）。  
- **`home_seo`**：运营字段请在管理端 **「首页 SEO」** 改；旧库补默认键仍由 **`migrate`** 处理。  

控制面全量说明见 [08-管理后台与SEO控制面.md](./08-管理后台与SEO控制面.md)。

**发布辅助**：接口抽样 **`backend/scripts/publish_smoke.sh`**；推荐分即时重算（可选）**`cd backend && PYTHONPATH=. python scripts/recompute_recommend_scores.py`**（见 [需求-I](./需求-I-工具列表推荐排序算法-v1.md)）。详见 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) §0.2、[09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) §2.3。

---

**维护**：新增暂缓项时用表格追加；关闭项可移至「已关闭」表并同步 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md)。


---

# 上线发布验收清单（模板）

**项目名称**：AI 工具导航站（前台 + 管理端 + FastAPI）  
**版本**：1.0.0  
**报告日期**：________（填写）  
**验收环境**：□ 预生产　□ 生产（勾选）

---

## 1. 验收结论摘要

| 项 | 结果 |
|----|------|
| 功能验收 | □ 通过　□ 有条件通过　□ 不通过 |
| 接口联调 | □ 通过　□ 有条件通过　□ 不通过 |
| 安全基线（HTTPS、密钥、管理员口令、演示账号） | □ 通过　□ 不通过 |
| 性能与可用性（抽样） | □ 通过　□ 不通过 |

**遗留问题（简要）**：与 [**03-开放事项总表.md**](./手册-C-开放事项与演进对照.md) 对照即可，避免与已知 backlog 脱节。

**签字/确认**：___________________________

---

## 2. 走查范围（全站路由）

### 2.1 前台（React Router）

按 `frontend/src/app/routes.tsx` **逐项**打开：**/**、**/tool/:id**、**/compare**、**/compare/:toolName**、**/dashboard**、**/profile**、**/edit-profile**、**/favorites**、**/settings**、**/submit**、**/sitemap**、**/guide**、**/more**、**/support/faq**、**/support/contact**、**/support/privacy**、**/support/terms**、通配 **404**。确认无白屏、无持续性控制台错误、关键接口 2xx。

### 2.2 管理后台（Next）

- `/login` 登录拦截。  
- **`/admin/dashboard`**、**`/admin/analytics`**、**`/admin/tools`**、**`/admin/tools/[id]/edit`**、**`/admin/users`**、**`/admin/reviews`**、**`/admin/monetization`**、**`/admin/page-seo`**、**`/admin/tool-json-ld`**、**`/admin/site-blocks`**、**`/admin/search-suggestions`**、**`/admin/site-submit`**、**`/admin/site-dashboard`**、**`/admin/home-seo`**、**`/admin/translations`**、**`/admin/comparisons`**、**`/admin/settings`**。  
- 侧栏以 **`admin_settings.admin_menu_items`** 为准；无有效项时用内置 fallback。  
- **管理端各页**：以**人工走查**为主（与 [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) **TC-EXEC** 一致）。

### 2.3 接口抽样

- **CI（可选参考）**：推送/PR 至默认分支时，**`.github/workflows/ci.yml`** 会执行前台与管理端 **`npm run build`**、后端 **`py_compile`**，并在本机起 **`uvicorn`** 后跑同一套 **`publish_smoke.sh`**（与下列手工命令等价思路）。
- **自动化子集**：仓库 **`backend/scripts/publish_smoke.sh`** 可对 `BASE_URL` 执行部分公开路径检查（401/200）；运行前 `chmod +x`，示例：`BASE_URL=https://api.example.com ./backend/scripts/publish_smoke.sh`。
- 未登录 `POST /api/submissions/tool`：请求体须满足 **`SubmitToolBody`**（否则 FastAPI 先返回 **422**）；**`publish_smoke.sh`** 已带合法最小 JSON，期望 → **401**  
- 管理员 `GET /api/admin/tools` → **200**  
- 登录用户：`GET /api/me`、`PUT /api/me/profile`（抽样）；`GET /api/me/orders`（与 **Monetization** 抽样一致）；`GET /api/me/activity`（抽样）  
- 收藏：`GET /api/me/favorites?locale=...`、详情页 **check / POST / DELETE**  
- 公开 `GET /api/site/frontend_nav`（与 **Settings → 前端用户菜单**一致）  
- （可选）`GET /api/seo/sitemap.xml`、`GET /api/seo/robots.txt` 状态码与根 URL 指向生产域  

---

## 3. 联调验证记录

| 区块 | 覆盖示例 | 实际 | 备注 |
|------|----------|------|------|
| 公开 API | 工具列表、分类、locales、`frontend_nav`、`page_seo`、`home_seo` 等 | | |
| 认证与用户 | 登录、资料、收藏、活动 | | |
| 提交与审核 | 投稿与管理端工具状态 | | |
| 管理配置 | 站点 JSON、首页 SEO、后台各页（多人工） | | |

---

## 4. 部署与配置核对

细则见 [**01-部署指南.md**](./手册-A-部署安全-发布与运维.md) 与 [**02-架构与程序说明.md**](./手册-B-架构程序与API索引.md) §5。

- [ ] （可选）在 API 构建目录执行 **`python scripts/verify_release_env.py`**：**JWT**（生产）、**CORS WARN**、**PostgreSQL SELECT 1**（若配置 **`DATABASE_URL`**）；见 [**21-SEC-OPS-TC-ENG-P-AI策略与Backlog对照.md**](./手册-C-开放事项与演进对照.md) §1  
- [ ] 对外 **HTTPS** 已启用  
- [ ] 后端 **`ENVIRONMENT=production`** 已设置（启用弱密钥启动拦截）  
- [ ] **`JWT_SECRET`** 非弱值且长度充足（[04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md) **SEC-01**）  
- [ ] 生产环境 **演示账号 / 管理员口令** 已更换，非仓库默认值  
- [ ] **`ALLOWED_ORIGINS`** 与生产 Origin 一致  
- [ ] 前台 **`VITE_API_BASE`** 指向生产 API  
- [ ] **`VITE_PUBLIC_SITE_URL`** 与后端 **`PUBLIC_SITE_URL`** 与真实站点域一致（canonical / sitemap）  
- [ ] 管理端 **`API_PROXY_TARGET`** 可达 API  
- [ ] **数据库**：SQLite 时 **`data/app.db`**（或实际路径）权限与备份；若 **`DATABASE_URL`**（PostgreSQL），确认 DSN、**`psycopg`** 依赖、迁移与备份  

---

## 5. 风险与回滚

- **回滚**
  - **前台**：恢复上一版 **`frontend/dist`**（或 CDN / 对象存储上的对应版本）；确认 **`VITE_API_BASE`**、**`VITE_PUBLIC_SITE_URL`** 与回退后的行为一致。
  - **管理端**：恢复上一版 Next 构建或运行镜像；确认 **`API_PROXY_TARGET`** 仍指向正确 API。
  - **API**：回退后端进程/容器或部署制品（与 [**01-部署指南.md**](./手册-A-部署安全-发布与运维.md) 一致）；核对 §4 **`ALLOWED_ORIGINS`**、密钥类变量与回退版本匹配。
  - **数据库**：若本次发布包含 **schema/数据迁移**（`backend/app/migrate.py` 等），**不得**假设「只回代码」即可恢复兼容，须按**变更单或运维手册**执行逆向迁移、从备份还原或切换只读副本；无迁移的纯代码回退通常可保持现库不动。
- **数据备份**（与 §4 数据库项一并勾选；发布前确认可恢复）
  - **SQLite**：备份 **`backend/data/app.db`**（默认路径，见 **`backend/app/paths.py`**）；宜在低写入窗口或短暂停服后复制单文件，避免拷贝到半写状态。
  - **PostgreSQL**：使用云平台**实例快照**或 **`pg_dump` / 定时逻辑备份**；选用 PG 时须单独完成环境与备份演练（**ENG-PG**，见 [**03-开放事项总表.md**](./手册-C-开放事项与演进对照.md)）。

---

*填写「报告日期」「实际/备注」列后归档；模板本身不记录迭代过程性说明。*


---

# 部署与发布完整说明书

本文整合 **环境准备、三端部署、生产配置、发布流程、验证与回滚**，并与 [01-部署指南.md](./手册-A-部署安全-发布与运维.md)、[09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md)、[04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md) **互补**：**01** 偏多平台分步教程，**09** 偏验收勾选；本文偏 **端到端 SOP 与发布对账**。

---

## 1. 系统组成与制品

| 逻辑服务 | 技术 | 典型制品 | 默认开发端口 |
|----------|------|----------|----------------|
| **API** | FastAPI + Uvicorn | 进程或容器内 `uvicorn app.main:app` | 8000 |
| **前台** | Vite + React | `frontend/dist` 静态文件 | 5173（dev） |
| **管理后台** | Next.js 14 | `next start` 或 Node 常驻 | 3000（dev） |

**浏览器访问规则**：前台构建时的 **`VITE_API_BASE`** 必须是浏览器可解析的 **公网 API 根 URL**（含 `https`），不可填 Docker 内部主机名（浏览器无法解析）。

---

## 2. 前置条件

### 2.1 运行环境版本

- **Python**：3.10+（推荐 3.11，与 CI 一致）
- **Node.js**：20 LTS（前台与管理端构建）

### 2.2 网络与域名（生产建议）

- **HTTPS**：对外统一 TLS（Nginx / Caddy / 云 LB + 证书）。
- **典型域名切分**：`www`（前台静态）、`admin`（管理端）、`api`（FastAPI）；亦可 **同域路径反代**（`/api` → 后端），此时 CORS 与 Cookie 策略需单独验证。

---

## 3. 后端（API）部署

### 3.1 安装与启动（通用）

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
export ENVIRONMENT=production
export JWT_SECRET="<至少24字符随机串>"
export ALLOWED_ORIGINS="https://www.example.com,https://admin.example.com"
export PUBLIC_SITE_URL="https://www.example.com"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- **虚拟环境**：勿跨机器复制 `.venv`；异常时删除后重建（见 [01](./手册-A-部署安全-发布与运维.md) §6）。
- **数据库**：未设 `DATABASE_URL` 时使用 **`backend/data/app.db`**（SQLite）；生产请做好**文件级备份**与权限控制。若使用 **PostgreSQL**，设置 `DATABASE_URL` 并单独完成建表/迁移与备份演练（[03](./手册-C-开放事项与演进对照.md) §3.1 ENG-PG）。

### 3.2 生产环境变量（完整清单）

| 变量 | 必需性 | 含义 |
|------|--------|------|
| `ENVIRONMENT` | **生产强烈建议必填** | 设为 `production`：弱 `JWT_SECRET` **拒绝启动**；演示账号不覆盖已有用户密码哈希。 |
| `JWT_SECRET` | **生产必填** | JWT 签名密钥；长度与弱值校验见 `env_guard.py`。 |
| `ALLOWED_ORIGINS` | **跨域部署必填** | 逗号分隔的完整 Origin（协议+主机+端口）；未设时仅匹配本机/私网正则，**公网前端易 CORS 失败**；生产未设会在 stderr **WARN**。 |
| `PUBLIC_SITE_URL` | **生产建议** | sitemap/robots 等绝对 URL 根（无尾斜杠）；与前台 `VITE_PUBLIC_SITE_URL` 对齐。 |
| `DATABASE_URL` | 可选 | `postgresql://...` 时使用 PG；否则 SQLite。 |
| `APP_VERSION` | 可选 | 写入 OpenAPI 与 **`GET /api/health`** 的 `api_version`，便于与静态资源发布对账。 |
| `GIT_SHA` / `GITHUB_SHA` | 可选 | CI 注入时出现在 **`/api/health`** 的 `build.git_sha`。 |
| `BUILD_ID` | 可选 | 流水线或镜像号，出现在 `build.build_id`。 |
| `SMTP_*` | 可选 | 管理端「发邮件」真实投递；未配则 stub（见 [06](./手册-B-架构程序与API索引.md)）。 |
| `AI_INSIGHT_LLM_API_KEY` | 可选 | AI SEO 全局 Key，优先于库内配置。 |
| `CRAWLER_SCHEDULER_ENABLED` | 可选 | `0` / `false` / `off` 关闭进程内爬虫定时器。 |

详注见 **`backend/.env.example`**、[02 §5](./手册-B-架构程序与API索引.md)。

### 3.3 Linux systemd 示例

见 [01-部署指南.md](./手册-A-部署安全-发布与运维.md) §2.2；**务必**将 `Environment=` 或 `EnvironmentFile=` 中的密钥与 CORS 改为生产值，且 **`WorkingDirectory`** 指向 `backend` 根目录。

### 3.4 健康检查与发布对账

- **`GET /api/health`**（无鉴权）：`status`、`api_version`、`database_backend`（`sqlite` / `postgresql`）、可选 `build.git_sha` / `build.build_id`。
- **负载均衡探活**：可使用该路径；**不查库业务表**，仅反映进程与配置层数据库类型。

---

## 4. 前台（用户站点）部署

### 4.1 构建

```bash
cd frontend
export VITE_API_BASE="https://api.example.com"
export VITE_PUBLIC_SITE_URL="https://www.example.com"
npm ci
npm run build
```

- 产物目录：**`frontend/dist`**，由 Nginx / OSS+CDN / 静态托管提供。
- **开发联调**：`npm run dev`，Vite 将 `/api` 代理到 `DEV_API_PROXY`（默认 `http://127.0.0.1:8000`），见 `frontend/.env.example`。

### 4.2 与后端联调要点

- `ALLOWED_ORIGINS` 必须包含前台页面的 **Origin**（例如 `https://www.example.com`）。
- 若 JWT 与埋点使用跨域 Cookie，需同时校验 **SameSite、Secure、域名**（当前实现以 **Authorization Bearer** 为主，见 [06](./手册-B-架构程序与API索引.md) 说明）。

---

## 5. 管理后台部署

### 5.1 构建与运行

```bash
cd admin
export API_PROXY_TARGET="http://127.0.0.1:8000"   # 或内网 API 根；为 Next **服务端** rewrite 目标
npm ci
npm run build
npm run start
```

- **生产常见形态**：Nginx 将 `https://admin.example.com` 反代到 Node 监听的 `127.0.0.1:3000`（端口自定）。
- **`API_PROXY_TARGET`**：须为 **Next 服务器进程能访问**的 API 地址；若管理端与 API 经同机反代，可为 `http://127.0.0.1:8000`。

### 5.2 管理员登录

- 默认种子含 **`admin@example.com` / `admin123`**（见 [06](./手册-B-架构程序与API索引.md)）；**生产必须改密**且勿依赖默认口令。

---

## 6. Docker 与编排（参考）

仓库**未内置**官方 `docker-compose.yml`，可按三服务自行编写：

- **api**：安装 `requirements.txt`，挂载 **`backend/data`** 持久化 SQLite（或外置 PG）。
- **web**：多阶段构建 `frontend`，`nginx:alpine` 托管 `dist`，构建参数传入 `VITE_*`。
- **admin**：构建后 `next start`，注入 `API_PROXY_TARGET`。

要点同 §1：**浏览器用的 API 地址**与 **容器内互通地址**分离。

---

## 7. 发布流程（SOP）

### 7.1 发布前（必做）

1. 合并前通过 **CI**（`.github/workflows/ci.yml`）：三端 build + 本机起 API 后 **`publish_smoke.sh`**。
2. 按 [09 §4](./手册-A-部署安全-发布与运维.md) 勾选：**HTTPS、`ENVIRONMENT`、`JWT_SECRET`、`ALLOWED_ORIGINS`、前后台构建变量、DB 备份**。
3. **数据库**：若有 `migrate.py` 增量，先在预发执行并验证；SQLite 发布前复制 `app.db` 备份；PG 按平台快照或 `pg_dump`。
4. 注入 **`APP_VERSION` + `GIT_SHA`（或 `BUILD_ID`）**，便于与 **`/api/health`** 对账。

### 7.2 发布顺序（建议）

1. **API** 先发布或向后兼容；若有迁移，**先备份再执行迁移**。
2. **前台静态资源** 发布；CDN 需刷新缓存策略。
3. **管理端** 发布。
4. 调用 **`GET /api/health`** 确认版本与 `status`。
5. 对公网 API 执行：`BASE_URL=https://api.example.com ./backend/scripts/publish_smoke.sh`（见 [09 §2.3](./手册-A-部署安全-发布与运维.md)）。
6. 按 [09 §2.1～2.2](./手册-A-部署安全-发布与运维.md) **人工走查**关键路径（CI 不能替代）。

### 7.3 发布后冒烟

- 登录 / 登出、首页、工具详情、管理端登录、随机 1～2 个写操作（如保存设置）抽样。

---

## 8. 回滚策略

与 [09 §5](./手册-A-部署安全-发布与运维.md) 一致，补充操作要点：

| 组件 | 回滚动作 | 注意 |
|------|----------|------|
| **前台** | 恢复上一版 `dist` 或 CDN 版本 | 确认 `VITE_*` 与当时构建一致 |
| **管理端** | 恢复上一版 Next 构建/镜像 | 确认 `API_PROXY_TARGET` |
| **API** | 回退进程/镜像 | 核对环境变量与 **JWT** 兼容性 |
| **数据库** | 仅当**无向前不兼容迁移**时可保留现库；否则按变更单从备份还原 | 见 [09 §5](./手册-A-部署安全-发布与运维.md) 数据库小节 |

---

## 9. 常见问题（FAQ）

- **CORS 错误**：核对 `ALLOWED_ORIGINS` 是否与浏览器地址栏 **完全一致**（含 `https` 与端口）。
- **管理端 401**：Token 过期或用户非 admin；重新登录。
- **sitemap 域名错误**：核对 `PUBLIC_SITE_URL` 与前台 `VITE_PUBLIC_SITE_URL`。
- **生产启动失败（JWT）**：按 stderr 提示更换 `JWT_SECRET`（≥24 字符，非占位）。

更全 FAQ 见 [01 §6](./手册-A-部署安全-发布与运维.md)。

---

## 10. 相关文档与脚本

| 资源 | 说明 |
|------|------|
| [01-部署指南.md](./手册-A-部署安全-发布与运维.md) | 分平台逐步说明（含 Windows） |
| [09-上线发布验收清单.md](./手册-A-部署安全-发布与运维.md) | 验收模板与勾选表 |
| [04-P0安全与联调备忘.md](./手册-A-部署安全-发布与运维.md) | 安全摘要 |
| [03-开放事项总表.md](./手册-C-开放事项与演进对照.md) | P0/P1 汇总 |
| `backend/scripts/publish_smoke.sh` | 公网 API 抽样自检 |
| `.github/workflows/ci.yml` | 持续集成 |

---

*维护约定：与 `backend/.env.example`、CI 变量保持同步；重大流程变更时同步更新 [09](./手册-A-部署安全-发布与运维.md) §4～§5。*


---
