# MAIN ADMIN API — for coding agents

Audience: automation / Cursor / Claude / scripts.
Role: main admin. All mailboxes. Create mailbox expire_days up to 3650. No quota deduct.

Replace:
- `BASE` = site origin
- `TOKEN` = `em_` token created on 管理页 → API 令牌 while logged in as main admin

## Auth

```
Authorization: Bearer TOKEN
Content-Type: application/json
x-lang: zh
```

Do not send x-admin-auth with the API token. Session login still uses `x-admin-auth`.
A token cannot create/list/revoke tokens. Grant only the scopes the script needs.

## Recipes

### Mailboxes
Need `address.list.read` / `address.create.write` / `address.credential.read` / write scopes
```
GET BASE/admin/address?limit=20&offset=0&query=&sort_by=id&sort_order=descend&group_id=
POST BASE/admin/new_address
{"name":"alice","domain":"example.com","enablePrefix":false,"enableRandomSubdomain":false,"expire_days":365,"note":"客户A","group_id":1}
GET  BASE/admin/show_password/{address_id}          → { jwt }
POST BASE/admin/address/{address_id}/reset_password
DELETE BASE/admin/delete_address/{address_id}
DELETE BASE/admin/clear_inbox/{address_id}
DELETE BASE/admin/clear_sent_items/{address_id}
```
Create returns `{ address, jwt, password, address_id, note, group_id }`. `note` is optional, only visible to this actor.
Create `group_id` is optional: the mailbox always joins the default owner group, and also joins this extra group if you own it. Invalid or foreign `group_id` → 400/404.
List `group_id` filters by a group you own. Each list row includes this actor's `note`.

### Inbox / unknown / sent
Need `mail.inbox.read` / `mail.inbox.write` / `mail.unknown.read` / sendbox scopes
```
GET BASE/admin/mails?limit=20&offset=0&address=
GET BASE/admin/mails/{id}
DELETE BASE/admin/mails/{id}
GET BASE/admin/mails_unknow?limit=20&offset=0
GET BASE/admin/sendbox?limit=20&offset=0
DELETE BASE/admin/sendbox/{id}
```
Unknown mail = raw_mails whose address is not in `address`. Delete unknown with the same `DELETE /admin/mails/{id}` (`mail.inbox.write`).

### Send
Need `send.mail.write`
```
POST BASE/admin/send_mail
{"from_mail":"alice@example.com","from_name":"","to_mail":"a@b.com","to_name":"","subject":"hi","content":"body","is_html":false}
POST BASE/admin/send_mail_by_binding
{"from":"alice@example.com","to":"a@b.com","subject":"hi","text":"body","html":""}
```

### Sender access (balance)
Need `sender_access.list.read` / `sender_access.update.write` / `sender_access.delete.write`
```
GET BASE/admin/address_sender?limit=20&offset=0&address=
POST BASE/admin/address_sender
{"address_id":1,"address":"alice@example.com","balance":10,"enabled":true}
DELETE BASE/admin/address_sender/{id}
```

### Account / IP / webhook settings
Need the matching settings.* scope
```
GET|POST BASE/admin/account_settings
GET|POST BASE/admin/ip_blacklist/settings
GET|POST BASE/admin/webhook/settings
GET|POST BASE/admin/mail_webhook/settings
POST BASE/admin/mail_webhook/test
```

### Groups and notes
Need `address.group.read` / `address.group.write` / `address.note.write`
Groups and notes belong to the current actor (main). Sub-admin groups are invisible here.
```
GET  BASE/admin/address_groups
POST BASE/admin/address_groups
{"name":"销售"}
POST BASE/admin/address_groups/{id}
{"name":"销售-改"}
DELETE BASE/admin/address_groups/{id}
GET  BASE/admin/address_groups/{id}/members
POST BASE/admin/address_groups/{id}/members
{"address_ids":[1,2]}
DELETE BASE/admin/address_groups/{id}/members
{"address_ids":[2]}
GET  BASE/admin/address_notes
POST BASE/admin/address/{address_id}/note
{"note":"客户A"}
GET|POST BASE/admin/group_limits
{"sub":10,"user":10}
```
Default owner groups are created for main: `我自己开的` plus one group named after each sub-admin. New mailboxes join that group automatically. New sub-admins get a new default group. Do not `DELETE` a default group (400). Creating a sub-admin also creates its default group without an extra call.

### Sub-admins and quota
Need `sub_admin.*`
```
GET  BASE/admin/sub_admins
POST BASE/admin/sub_admins
{"username":"ops","password":"<hash-or-stored-form>","enabled":true,"quota_balance":10}
POST BASE/admin/sub_admins/{id}
{"username":"ops","password":"","enabled":true}
DELETE BASE/admin/sub_admins/{id}
POST BASE/admin/sub_admins/{id}/quota
{"delta":5}
GET  BASE/admin/sub_admins/{id}/ledger
GET|POST BASE/admin/domain_create_costs
```

### AI advisor
Need `ai_advisor.read` / `ai_advisor.write` / policy scopes
```
GET  BASE/admin/ai_advisor/mailboxes
GET|POST BASE/admin/ai_advisor/auth     {"addresses":["a@b.com"]}
GET  BASE/admin/ai_advisor/models
GET|POST BASE/admin/ai_advisor/provider
POST BASE/admin/ai_advisor/test
POST BASE/admin/ai_advisor/chat         {"message":"..."}
GET|DELETE BASE/admin/ai_advisor/messages
GET|POST BASE/admin/ai_advisor/policy
```

### Telegram / stats / maintenance / appearance
```
GET  BASE/admin/telegram/status          telegram.read
GET|POST BASE/admin/telegram/settings    telegram.read / telegram.write
POST BASE/admin/telegram/init            telegram.write
GET  BASE/admin/statistics               statistics.read
GET  BASE/admin/db_version               maintenance.read
GET  BASE/admin/worker/configs           maintenance.read
GET|POST BASE/admin/auto_cleanup         maintenance.read / write
POST BASE/admin/cleanup                  maintenance.write
POST BASE/admin/db_initialize            maintenance.write
POST BASE/admin/db_migration             maintenance.write
GET|POST BASE/admin/global_ui_prefs      appearance.read / write
```

## Scopes this role can grant

All catalog items: address.* (including address.group.read/write, address.note.write), mail.* (including mail.unknown.read), send.mail.write, sender_access.*, settings.*, sub_admin.*, ai_advisor.*, telegram.*, statistics.read, maintenance.*, appearance.*

## Do not call

- `/external/api/send_mail` — removed; use `POST /admin/send_mail`
- `/user_api/*`, `/admin/users*`, `/admin/user_settings`, `/admin/user_oauth2_settings` — removed
- `/admin/ai_extract/settings` — inbound extract switch, not tokenized
- `/admin/test/seed_mail`, `/admin/test/receive_mail` — E2E only, 404 unless E2E_TEST_MODE
- `/telegram/*` miniapp — Telegram initData, not this token
- Token CRUD with this token — 403; use the web session
