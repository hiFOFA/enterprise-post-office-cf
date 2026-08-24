# SUB-ADMIN API — for coding agents

Audience: automation / Cursor / Claude / scripts.
Role: sub-admin. Can only see/change mailboxes they own (`owner_admin_type=sub` + own id).
Create mailbox expire_days ≤ 90. Creating a mailbox deducts quota.

Replace:
- `BASE` = site origin
- `TOKEN` = `em_` token created on 管理页 → API 令牌 while logged in as this sub-admin

## Auth

```
Authorization: Bearer TOKEN
Content-Type: application/json
x-lang: zh
```

Do not send x-admin-auth with the API token. Session login still uses `x-admin-auth`.
A token cannot create/list/revoke tokens.
Unowned mailbox → 403. Main-only path → 403 even if you invent the scope.

## Recipes

### List / create mailboxes
Need `address.list.read` / `address.create.write`
```
GET BASE/admin/address?limit=20&offset=0&query=&sort_by=id&sort_order=descend&group_id=
POST BASE/admin/new_address
{"name":"alice","domain":"example.com","enablePrefix":false,"enableRandomSubdomain":false,"expire_days":30,"note":"客户A","group_id":1}
```
Create returns `{ address, jwt, password, address_id, note, group_id }`. Save jwt if a human needs mailbox login. Scripts should use this admin token, not the mailbox jwt.
`expire_days` max 90. Quota is deducted by domain cost.
`note` is optional and only visible to this sub-admin. Main cannot see it.
Create `group_id` is optional and must be a group this sub-admin owns. The mailbox also joins main's default group named after this sub-admin. That group lives on main's side, not here.

### Credentials / password / delete / clear
Need matching address.* write/read
```
GET  BASE/admin/show_password/{address_id}          → { jwt }
POST BASE/admin/address/{address_id}/reset_password
DELETE BASE/admin/delete_address/{address_id}
DELETE BASE/admin/clear_inbox/{address_id}
DELETE BASE/admin/clear_sent_items/{address_id}
```

### Read / delete mail of owned boxes
Need `mail.inbox.read` / `mail.inbox.write`
```
GET BASE/admin/mails?limit=20&offset=0&address=alice@example.com
GET BASE/admin/mails/{id}
DELETE BASE/admin/mails/{id}
```
`address` query optional; without it, all owned inboxes. Unknown-mail list is main-only — do not call `/admin/mails_unknow`.

### Sent box
Need `mail.sendbox.read` / `mail.sendbox.write`
```
GET BASE/admin/sendbox?limit=20&offset=0
DELETE BASE/admin/sendbox/{id}
```

### Send as an owned mailbox
Need `send.mail.write`
```
POST BASE/admin/send_mail
{"from_mail":"alice@example.com","from_name":"","to_mail":"a@b.com","to_name":"","subject":"hi","content":"body","is_html":false}
```
Binding raw send (optional, same scope):
```
POST BASE/admin/send_mail_by_binding
{"from":"alice@example.com","to":"a@b.com","subject":"hi","text":"body"}
```

### Groups and notes (this sub-admin only)
Need `address.group.read` / `address.group.write` / `address.note.write`
These groups are not the main-admin default owner groups. Member mailboxes must be owned by this sub-admin.
```
GET  BASE/admin/address_groups
POST BASE/admin/address_groups
{"name":"本月"}
POST BASE/admin/address_groups/{id}
{"name":"本月-改"}
DELETE BASE/admin/address_groups/{id}
GET  BASE/admin/address_groups/{id}/members
POST BASE/admin/address_groups/{id}/members
{"address_ids":[1,2]}
DELETE BASE/admin/address_groups/{id}/members
{"address_ids":[2]}
GET  BASE/admin/address_notes
POST BASE/admin/address/{address_id}/note
{"note":"客户A"}
GET  BASE/admin/group_limits
```
POST `/admin/group_limits` is main-only.

### Domain create costs (read only)
Need `sub_admin.costs.read`
```
GET BASE/admin/domain_create_costs
```
POST this path is forbidden for sub-admin.

### AI advisor (owned mailboxes)
Need `ai_advisor.read` / `ai_advisor.write`
```
GET  BASE/admin/ai_advisor/mailboxes
GET  BASE/admin/ai_advisor/auth
POST BASE/admin/ai_advisor/auth
{"addresses":["alice@example.com"]}
GET  BASE/admin/ai_advisor/models
GET  BASE/admin/ai_advisor/provider
POST BASE/admin/ai_advisor/provider
{"provider":"cf"|"openai"|"claude","cfModel":"","baseUrl":"","modelId":"","apiKey":""}
POST BASE/admin/ai_advisor/test
POST BASE/admin/ai_advisor/chat
{"message":"summarize unread"}
GET  BASE/admin/ai_advisor/messages
DELETE BASE/admin/ai_advisor/messages
```

## Scopes this role can grant

address.list.read, address.credential.read, address.create.write, address.password.write, address.delete.write, address.clear_inbox.write, address.clear_sent.write, address.group.read, address.group.write, address.note.write
mail.inbox.read, mail.inbox.write, mail.sendbox.read, mail.sendbox.write
send.mail.write
ai_advisor.read, ai_advisor.write

## Do not call (403 even with a “full” sub token)

- `/admin/sub_admins*` and quota adjust — main only
- `POST /admin/group_limits` — main only
- `/admin/mails_unknow`
- `/admin/account_settings`, `/admin/ip_blacklist/*`, `/admin/webhook/*`
- `/admin/telegram/*`, `/admin/statistics`, `/admin/db_*`, `/admin/cleanup*`
- `/admin/global_ui_prefs`, `/admin/ai_advisor/policy`
- `/admin/users*`, `/user_api/*`, `/external/api/send_mail` — removed
- `/admin/ai_extract/*`, `/admin/test/*` — not for scripts
- `/api/*` mailbox paths — use `/admin/*` with this token
