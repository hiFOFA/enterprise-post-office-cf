---
name: deploy-cf-post-office
description: >-
  Clones and deploys this Cloudflare enterprise post office (Workers + D1 + Vue).
  Use when the user pastes the README deploy prompt, asks to 一键部署 / deploy this
  project, or mentions wrangler + 企业邮局.
---

# 部署企业邮局

你是本仓库的部署助手。先克隆，再按本技能提问、验证、部署。不要跳步。

## 铁律

1. **没问清、没验证通过，不准 deploy。**
2. 令牌、密码、Account ID **只存在本次会话**。不要写进 git、不要写进 `README`、不要贴回聊天（回显时打码）。
3. 用环境变量喂给 wrangler，不要把 `CLOUDFLARE_API_TOKEN` 写进仓库文件。
4. `worker/wrangler.toml` 已在 `.gitignore`。可以本地生成，**不要 commit**。
5. 部署成功后，**必须**提醒用户立刻到 Cloudflare 仪表盘撤销刚才发给你的 API 令牌。
6. 公开 `POST /api/new_address` 必须保持 403，不要打开匿名开号。
7. 一项一项问，等用户答完再问下一项。不要一次甩十个空。

## 第 0 步：克隆

仓库主人：`https://github.com/hiFOFA/`  
克隆地址以用户给的为准；没有就问仓库名。

```bash
git clone https://github.com/hiFOFA/enterprise-post-office-cf.git
cd enterprise-post-office-cf
```

先读 `worker/wrangler.toml.template` 和 `db/schema.sql`，再开始提问。细节见 [reference.md](reference.md)。

## 第 1 步：用白话说明再要东西

每次开口先说：**「这些只存在这次对话里，部署完请马上撤销令牌。我不会写进项目文件，也不会拿去干别的。」**

对每一项，用小白话说明「用来干嘛」，再问用户要不要给。

| 你要什么 | 白话（必须原样说清楚） |
|----------|------------------------|
| Cloudflare **API 令牌** | 用来替你在 Cloudflare 上建数据库、把网站代码传上去。**不是**登录密码，也**不是**邮箱密码。权限尽量只勾「Workers 脚本 / D1 / 账号」相关编辑。用完就作废。 |
| **Account ID** | 一串账号编号，告诉系统传到「哪一个 Cloudflare 账号」。在仪表盘右侧能看见。**不是**密钥，丢了别人也不能登录你的邮箱。 |
| **主管理员用户名** | 你自己起的后台登录名，例如 `admin`。部署后用它进管理台。 |
| **主管理员密码** | 你自己定的后台密码。会存成 Cloudflare Worker 密钥。浏览器登录前会哈希；你告诉我的明文原样写入 secret，**不要先哈希**。 |
| **收信域名** | 邮箱后缀，例如 `mail.example.com`。邮件要打到这个域名，还要在 Cloudflare 打开 Email Routing。 |
| **站点怎么访问** | 见下一节三选一。 |

可选（用户说「以后再说」就跳过）：

| 可选 | 白话 |
|------|------|
| KV 命名空间 | 用来存 Telegram / Webhook 这类开关。现在不用可以不建。 |
| 发信（SEND_MAIL / Resend） | 没有也能先收信。要对外发信再配。 |

JWT 密钥：用户没给就由你生成 32 字节以上随机十六进制，写入 secret `JWT_SECRET`，不要问得太吓人。

## 第 2 步：站点域名（必问）

问用户三选一：

1. **Worker 自带二级域名** `xxxxxxxx.<子域>.workers.dev`  
   零配置，有的地区打不开。适合先看一眼。
2. **用户提供、已经挂在自己 Cloudflare 账号上的域名**（推荐）  
   例如 `mail.example.com`。Worker 与 DNS 必须在**同一个**账号。
3. **用户提供一个要绑到这个 Worker 的自定义域名**  
   你按 Cloudflare 自定义域绑上去；绑不上就停下来让用户在仪表盘点一下，不要死循环。

记下选择，再往下走。

## 第 3 步：验证令牌

```bash
export CLOUDFLARE_API_TOKEN='…'
export CLOUDFLARE_ACCOUNT_ID='…'
cd worker && npx wrangler whoami
```

`whoami` 失败就停，告诉用户令牌权限不够或 ID 错了，**不要 deploy**。

## 第 4 步：建库并部署

默认走 **Worker `[assets]`**（前端打进 Worker），不要无故上 Pages。

1. `cd worker && cp wrangler.toml.template wrangler.toml`
2. 改 `name`（可用 `cf-post-office` 或用户指定）
3. `keep_vars = true`
4. 选择 1：`workers_dev = true`，不要乱加 routes  
   选择 2/3：加 `routes = [{ pattern = "用户的域名", custom_domain = true }]`
5. `DOMAINS` / `DEFAULT_DOMAINS` 写成用户的收信域名
6. `PREFIX = ""`，`ENABLE_ADDRESS_PASSWORD = true`（若模板是注释就打开）
7. 打开 `[assets]`：`directory = "../frontend/dist"`，`binding = "ASSETS"`，`run_worker_first = true`
8. 建 D1，绑定名必须是 `DB`：

```bash
npx wrangler d1 create <库名>
```

把返回的 `database_id` 填进 `wrangler.toml`。

9. 新库执行 `npx wrangler d1 execute <库名> --remote --file ../db/schema.sql`
10. Secret（用 stdin，不要出现在命令历史明文参数里）：

```bash
printf '%s' "$ADMIN_USERNAME" | npx wrangler secret put ADMIN_USERNAME
printf '%s' "$ADMIN_PASSWORD" | npx wrangler secret put ADMIN_PASSWORD
printf '%s' "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
```

11. 前端：`cd frontend && pnpm i && pnpm build`（`VITE_API_BASE` 留空，同源）
12. `cd worker && pnpm i && npx wrangler deploy`
13. 自定义域失败：把仪表盘报错原样告诉用户，不要假装成功。

更多命令见 [reference.md](reference.md)。

## 第 5 步：验收

对最终域名：

- `GET /health_check` 要通
- `GET /open_api/bootstrap` 要返回站点标题（无需令牌）
- `GET /open_api/settings` **没有**登录时应是 401（本项目如此）
- 打开首页应是登录页，不是 JSON 乱码

收信还要用户自己在 **Email Routing → Catch-all → 指向这个 Worker**。DNS 区和 Worker 必须同一账号。子域名收信不会自动继承，要单独开。这一点写进最终说明。

## 第 6 步：交付（必须包含撤销）

用这段结构回复用户（填入真实域名，不要填令牌）：

```
部署完成。

访问地址：https://<最终域名>
主管理登录：你刚才定的用户名 / 密码
收信：还请到 Cloudflare → Email Routing → Catch-all，指到这个 Worker。

请立刻撤销刚才发给我的 Cloudflare API 令牌：
仪表盘 → 我的个人资料 → API 令牌 → 删除本次创建的那一条。
项目已经部署好了，那条令牌不再需要。留着等于把账号钥匙放在聊天记录里。
```

## 失败时

只报真实错误。缺权限就让用户去令牌页加 Workers / D1。不要编造「已经部署成功」。
