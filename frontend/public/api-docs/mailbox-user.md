# MAILBOX USER API — for coding agents

Audience: automation / Cursor / Claude / scripts.
Role: mailbox user (one address). Not a human tutorial.

Replace:
- `BASE` = site origin, example `https://your-post-office.example`
- `TOKEN` = `em_` + 48 hex chars, created on 邮箱页 → API 令牌

## Auth

```
Authorization: Bearer TOKEN
Content-Type: application/json
x-lang: zh
```

Do not send x-admin-auth. Do not put the token in JSON body.
Empty scopes on create means all scopes this role can grant.
A token cannot create/list/revoke tokens. Create tokens in the web UI while logged in.

Errors:
- 401 = bad/revoked token or wrong role
- 403 = missing scope, or leftover API (do not use leftover APIs)

Identity (no extra scope): `GET /api/settings` → `{ address, send_balance, auto_reply }`

## Recipes

### Read inbox (raw MIME)
Need `mail.inbox.read`
```
GET BASE/api/mails?limit=20&offset=0
GET BASE/api/mail/{id}
```
List: `{ results, count }`. One mail: raw row (`id, address, source, raw, created_at`) or null.

### Read inbox parsed (body + attachment metadata)
Need `mail.inbox.read`
```
GET BASE/api/parsed_mails?limit=20&offset=0
GET BASE/api/parsed_mail/{id}
```
Same as raw plus `sender, subject, text, html, attachments[{filename,mimeType,disposition,size}]`.
Use this for agents. Attachment content is not included.

### Delete one inbox mail
Need `mail.inbox.write`. Server must have user-delete enabled.
```
DELETE BASE/api/mails/{id}
```
→ `{ success }`

### Sent box
Need `mail.sendbox.read` / `mail.sendbox.write`
```
GET BASE/api/sendbox?limit=20&offset=0
DELETE BASE/api/sendbox/{id}
```

### Send mail
Need `send.mail.write`. Address must have send_balance > 0 (see GET /api/settings).
```
POST BASE/api/send_mail
{"from_name":"","to_mail":"a@b.com","to_name":"","subject":"hi","content":"body","is_html":false}
```
→ `{ status:"ok" }`
If no balance: first `POST /api/request_send_mail_access` (`send.request.write`) → `{ status:"ok" }` then wait for admin to enable.

### Groups and notes (this mailbox login only)
Need `address.group.read` / `address.group.write` / `address.note.write`
Groups and notes belong to this mailbox actor. Admin notes/groups are invisible.
```
GET  BASE/api/address_groups
POST BASE/api/address_groups
{"name":"工作"}
POST BASE/api/address_groups/{id}
{"name":"工作-改"}
DELETE BASE/api/address_groups/{id}
GET  BASE/api/address_groups/{id}/members
POST BASE/api/address_groups/{id}/members
{"address_ids":[1]}
DELETE BASE/api/address_groups/{id}/members
{"address_ids":[1]}
GET  BASE/api/address_notes
POST BASE/api/address/{address_id}/note
{"note":"自己看的备注"}
```
Note is stored under this token actor. Admin notes on the same mailbox are a different row.

### Change mailbox password
Need `address.password.write`. `new_password` is SHA-256 hex of the plaintext (frontend hash).
```
POST BASE/api/address_change_password
{"new_password":"<sha256-hex>"}
```

### Delete this mailbox / clear boxes
Need `address.delete.write` / `address.clear_inbox.write` / `address.clear_sent.write`
```
DELETE BASE/api/delete_address
DELETE BASE/api/clear_inbox
DELETE BASE/api/clear_sent_items
```

### Auto reply / webhook / S3
Need `self_service.read` / `self_service.write`
```
GET  BASE/api/auto_reply
POST BASE/api/auto_reply
{"auto_reply":{"name":"","subject":"","source_prefix":"","message":"","enabled":true}}

GET  BASE/api/webhook/settings
POST BASE/api/webhook/settings
POST BASE/api/webhook/test

GET  BASE/api/attachment/list
POST BASE/api/attachment/put_url   {"key":"{mail_id}/{filename}"}
POST BASE/api/attachment/get_url   {"key":"..."}
POST BASE/api/attachment/delete    {"key":"..."}
```

### AI advisor (this mailbox)
Need `ai_advisor.read` / `ai_advisor.write`
```
GET  BASE/api/ai_advisor/auth
POST BASE/api/ai_advisor/auth
GET  BASE/api/ai_advisor/models
GET  BASE/api/ai_advisor/provider
POST BASE/api/ai_advisor/provider
{"provider":"cf"|"openai"|"claude","cfModel":"","baseUrl":"https://api.openai.com/v1","modelId":"","apiKey":""}
POST BASE/api/ai_advisor/test
POST BASE/api/ai_advisor/chat
{"message":"summarize unread"}
GET  BASE/api/ai_advisor/messages
DELETE BASE/api/ai_advisor/messages
```
User advisor is bound to the token mailbox. Do not send an addresses list.

## Scopes this role can grant

address.list.read, address.credential.read, address.password.write, address.delete.write, address.clear_inbox.write, address.clear_sent.write, address.group.read, address.group.write, address.note.write
mail.inbox.read, mail.inbox.write, mail.sendbox.read, mail.sendbox.write
send.mail.write, send.request.write
ai_advisor.read, ai_advisor.write
self_service.read, self_service.write

## Do not call

- `/api/new_address` — permanently 403
- `/admin/*` — user token is rejected
- `/external/api/send_mail` — removed
- `/user_api/*` — removed
- `/telegram/*` — Telegram initData, not this token
- `/admin/ai_extract/*`, `/admin/test/*` — not for scripts
