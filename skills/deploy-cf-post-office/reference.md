# 部署命令备忘

只在执行 `SKILL.md` 第 4 步时读这个文件。

## 令牌权限（让用户去仪表盘勾）

自定义令牌，账号资源选当前账号：

- Workers Scripts：编辑
- D1：编辑
- Account Settings：读（`whoami` 用）
- 若绑自定义域：Zone → Workers Routes 编辑，以及对应 Zone

创建页：`https://dash.cloudflare.com/profile/api-tokens`

Account ID：仪表盘首页右侧 Workers 概览也能看到。

## wrangler.toml 最小改动

从 `worker/wrangler.toml.template` 复制后：

```toml
name = "cf-post-office"
main = "src/worker.ts"
compatibility_date = "2025-04-01"
compatibility_flags = [ "nodejs_compat" ]
keep_vars = true
workers_dev = true   # 选自定义域时可改 false

# 选 Worker 二级域名：不要加 routes
# 选自定义域：
# routes = [{ pattern = "mail.example.com", custom_domain = true }]

[assets]
directory = "../frontend/dist/"
binding = "ASSETS"
run_worker_first = true

[vars]
PREFIX = ""
DEFAULT_DOMAINS = ["example.com"]
DOMAINS = ["example.com"]
ENABLE_USER_CREATE_EMAIL = true
ENABLE_USER_DELETE_EMAIL = true
ENABLE_ADDRESS_PASSWORD = true

[[d1_databases]]
binding = "DB"
database_name = "temp-email"
database_id = "<whoami 建库返回的 id>"
```

不要把 `ADMIN_PASSWORD`、`JWT_SECRET`、`CLOUDFLARE_API_TOKEN` 写进这份 toml。

## 前端

```bash
cd frontend
pnpm i
pnpm build
```

`VITE_API_BASE` 空 = 和站点同源。不要填错成别人的 API。

## 验收 URL

- `https://<域>/health_check`
- `https://<域>/open_api/bootstrap`
- `https://<域>/`

Workers.dev 在部分地区会被墙，自定义域更稳。不要在 API 主机前面挂「我是人类」挑战页，XHR 过不去。
