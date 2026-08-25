# i18n 缺失键完整清单（2026-08-25 审查生成）

> 生成方式：对比 `frontend/src/i18n/message-registry.ts`（905 键）与 de/es/ja/pt-BR 四个翻译文件。
> 四个语言缺失**同一批 287 键**（另有 9 个 AiExtractSettings 历史残留键，见主文档）。
> 执行 AI 按命名空间逐组翻译，en/zh 参照值如下。翻译写入对应语言文件（扁平键格式 `"ns.key": "译文"`）。


## components.MailContentRenderer

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| loadRemoteImages | Load Images | 加载图片 | de, es, ja, pt-BR |
| remoteImagesBlocked | {count} remote resources blocked to protect your privacy | 已阻止 {count} 项外部资源以保护隐私 | de, es, ja, pt-BR |

## views.Index

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| addressGroups | Groups | 分组 | de, es, ja, pt-BR |

## views.Admin

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| address_groups | Groups | 分组 | de, es, ja, pt-BR |
| subAdmins | Sub Admins | 子管理员 | de, es, ja, pt-BR |
| domainCreateCosts | Domain Create Cost | 域名开号单价 | de, es, ja, pt-BR |
| roleMain | Main admin | 主管理员 | de, es, ja, pt-BR |
| roleSub | Sub admin | 子管理员 | de, es, ja, pt-BR |
| sessionExpiredTip | Admin session expired. Enter username and password again, or go back to the login page. | 管理员登录已过期。请重新输入用户名和密码，或返回登录页。 | de, es, ja, pt-BR |
| backToLogin | Back to Login | 返回登录 | de, es, ja, pt-BR |
| username | Username | 用户名 | de, es, ja, pt-BR |
| password | Password | 密码 | de, es, ja, pt-BR |
| loginFailed | Login failed | 登录失败 | de, es, ja, pt-BR |

## views.user.AddressManagement

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| itemCount | Total | 总数 | de, es, ja, pt-BR |

## components.AiAdvisor

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| advisor | Advisor | 顾问 | de, es, ja, pt-BR |
| aiMissing | Cloudflare Workers AI is not bound on this worker, so chat is unavailable. | 当前 Worker 未绑定 Cloudflare Workers AI，暂时不能对话。 | de, es, ja, pt-BR |
| authHintAdmin | Pick sub-admins, expand to choose mailboxes, or select all in a group. | 先选子管理员，展开后勾具体邮箱，也可以点分组全选。 | de, es, ja, pt-BR |
| authHintUser | Choose from mailboxes saved in this browser. | 从本机已保存的邮箱里勾选要授权的地址。 | de, es, ja, pt-BR |
| authTitle | Authorize mailboxes | 授权邮箱 | de, es, ja, pt-BR |
| authorizedCount | {count} authorized | 已授权 {count} 个 | de, es, ja, pt-BR |
| chatCleared | Conversation cleared | 对话已清空 | de, es, ja, pt-BR |
| chatEmpty | Ask about verification codes, senders, or what a message means. Only authorized mailboxes are read. | 可以问验证码、是谁寄的、某封信在说什么。顾问只会读你授权过的邮箱。 | de, es, ja, pt-BR |
| chatFailed | The advisor could not answer. | 顾问暂时无法回答 | de, es, ja, pt-BR |
| chatHint | It only sees recent mail from authorized boxes. Pick a model on the right. | 顾问只能看到已授权邮箱里的最近邮件。右侧可切换模型。 | de, es, ja, pt-BR |
| chatPlaceholder | Ask about these mailboxes… | 问问这些邮箱里的邮件… | de, es, ja, pt-BR |
| chatTitle | Advisor chat | AI 对话 | de, es, ja, pt-BR |
| clearAll | Clear | 清空 | de, es, ja, pt-BR |
| clearChat | Clear chat | 清空对话 | de, es, ja, pt-BR |
| contactAdmin | Ask an administrator to enable Cloudflare Workers AI. | 请联系管理员开放 Cloudflare Workers AI | de, es, ja, pt-BR |
| customHint | OpenAI-compatible or Claude-compatible HTTPS API. The key stays on this account. | 可填 OpenAI 或 Claude 格式的 HTTPS 接口。密钥只保存在你自己的账号下。 | de, es, ja, pt-BR |
| driverCf | Cloudflare | Cloudflare | de, es, ja, pt-BR |
| driverCfDesc | Free Workers AI models on this worker. | 使用本站 Workers AI 免费模型 | de, es, ja, pt-BR |
| driverCustom | Custom API | 自定义 | de, es, ja, pt-BR |
| driverCustomDesc | Your own OpenAI or Claude compatible API. | 使用你自己的 OpenAI 或 Claude 接口 | de, es, ja, pt-BR |
| driverHint | Use one driver at a time. Cloudflare is only available if an admin enabled it for you; otherwise only custom works. | Cloudflare 和自定义只能选一个。有权限才能选 Cloudflare，没有权限只能用自定义。 | de, es, ja, pt-BR |
| driverPick | Which driver to use | 使用哪种驱动 | de, es, ja, pt-BR |
| driverTitle | Model driver | 模型驱动 | de, es, ja, pt-BR |
| driverUsing | In use | 当前使用 | de, es, ja, pt-BR |
| enableCf | Allow Cloudflare Workers AI | 允许使用 Cloudflare Workers AI | de, es, ja, pt-BR |
| emptyLocal | No local mailboxes yet. Sign in to a mailbox first. | 还没有本机保存的邮箱，请先登录一只邮箱。 | de, es, ja, pt-BR |
| emptyMailboxes | No mailboxes to authorize | 没有可授权的邮箱 | de, es, ja, pt-BR |
| loadFailed | Failed to load advisor | 加载顾问失败 | de, es, ja, pt-BR |
| saveAuth | Save authorization | 保存授权 | de, es, ja, pt-BR |
| saveFailed | Failed to save authorization | 保存授权失败 | de, es, ja, pt-BR |
| saved | Authorization saved | 授权已保存 | de, es, ja, pt-BR |
| searchMailbox | Search mailboxes | 搜索邮箱 | de, es, ja, pt-BR |
| selectAll | Select all | 全选 | de, es, ja, pt-BR |
| send | Send | 发送 | de, es, ja, pt-BR |
| settingsTitle | Settings | 设置 | de, es, ja, pt-BR |
| subAdmins | Sub-admins | 子管理 | de, es, ja, pt-BR |
| subDefault | Default (unconfigured sub-admins) | 默认（未单独配置的子管理） | de, es, ja, pt-BR |
| subInherited | Synced with default | 当前同步默认 | de, es, ja, pt-BR |
| subRestore | Revert to default | 恢复默认同步 | de, es, ja, pt-BR |
| users | Mailbox users | 用户 | de, es, ja, pt-BR |
| policyHint | This only decides who may use Cloudflare. Pick your own driver in Model driver. | 这里只配置谁能用 Cloudflare。你自己用哪种驱动，请到「模型驱动」里二选一。 | de, es, ja, pt-BR |
| policyOwnDriver | Your own Cloudflare / custom choice is on the Model driver tab. | 自己用 Cloudflare 还是自定义，请到「模型驱动」页选择。 | de, es, ja, pt-BR |
| policySaved | Access policy saved | 权限已保存 | de, es, ja, pt-BR |
| allowedModels | Allowed models | 可使用的模型 | de, es, ja, pt-BR |
| savePolicy | Save policy | 保存权限 | de, es, ja, pt-BR |
| saveDriver | Save and use this driver | 保存并使用此驱动 | de, es, ja, pt-BR |
| driverSaved | Driver saved | 驱动已保存 | de, es, ja, pt-BR |
| apiFormat | API format | 接口格式 | de, es, ja, pt-BR |
| baseUrl | Base URL | 请求地址 | de, es, ja, pt-BR |
| modelId | Model id | 请求模型 ID | de, es, ja, pt-BR |
| apiKey | API key | API Key | de, es, ja, pt-BR |
| apiKeyKept | A key is already saved. Leave blank to keep it. | 已保存过密钥，留空则不改。 | de, es, ja, pt-BR |
| test | Test | 测试 | de, es, ja, pt-BR |
| testHint | Sends “hi” and shows status, first-token time, and full reply. | 会发送 hi，并显示状态码、首字时间和完整回复。 | de, es, ja, pt-BR |
| testStatus | Status {status} | 状态 {status} | de, es, ja, pt-BR |
| firstToken | First token {ms} ms | 首字 {ms} ms | de, es, ja, pt-BR |
| totalTime | Complete {ms} ms | 完整 {ms} ms | de, es, ja, pt-BR |
| modelSelect | Model | 模型 | de, es, ja, pt-BR |
| needCustom | Save a custom API model id and key first. | 请先填写并保存自定义模型 ID 和 Key | de, es, ja, pt-BR |
| formatOpenAi | OpenAI | OpenAI | de, es, ja, pt-BR |
| formatClaude | Claude | Claude | de, es, ja, pt-BR |
| you | You | 你 | de, es, ja, pt-BR |

## components.ApiTokens

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| title | API tokens | API 令牌 | de, es, ja, pt-BR |
| hint | Create a token for scripts. Use Authorization: Bearer <token>. Read and write are separate. Defaults to everything you can do. | 给脚本用的令牌。请求头 Authorization: Bearer 令牌。每个大类可勾只读 / 可写，默认全开。只能勾你这个身份能做的事。 | de, es, ja, pt-BR |
| usage | Authorization: Bearer | 请求头 Authorization: Bearer | de, es, ja, pt-BR |
| lastUsed | Last used | 最近使用 | de, es, ja, pt-BR |
| neverUsed | Never used | 从未使用 | de, es, ja, pt-BR |
| name | Token name | 令牌名称 | de, es, ja, pt-BR |
| create | Create token | 新建令牌 | de, es, ja, pt-BR |
| created | Copy this token now. It will not be shown again. | 立刻复制这串令牌，关闭后不会再显示。 | de, es, ja, pt-BR |
| copy | Copy | 复制 | de, es, ja, pt-BR |
| copied | Copied | 已复制 | de, es, ja, pt-BR |
| revoke | Revoke | 撤销 | de, es, ja, pt-BR |
| revokeConfirm | Revoke this token? | 确定撤销这枚令牌？ | de, es, ja, pt-BR |
| empty | No tokens yet. | 还没有令牌 | de, es, ja, pt-BR |
| prefix | Prefix | 前缀 | de, es, ja, pt-BR |
| createdAt | Created | 创建时间 | de, es, ja, pt-BR |
| read | Read | 只读 | de, es, ja, pt-BR |
| write | Write | 可写 | de, es, ja, pt-BR |
| details | Details | 细分 | de, es, ja, pt-BR |
| loadFailed | Failed to load tokens | 加载令牌失败 | de, es, ja, pt-BR |
| saveFailed | Failed to create token | 创建令牌失败 | de, es, ja, pt-BR |
| nameRequired | Enter a name | 请填写令牌名称 | de, es, ja, pt-BR |
| needScope | Select at least one permission | 至少勾一项权限 | de, es, ja, pt-BR |
| downloadDoc | Download API spec for AI | 下载给 AI 的接口说明 | de, es, ja, pt-BR |
| downloadFailed | Failed to download the spec | 下载接口说明失败 | de, es, ja, pt-BR |

## components.ApiTokens.category

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| address | Mailboxes | 邮箱账号 | de, es, ja, pt-BR |
| mail | Mail | 邮件 | de, es, ja, pt-BR |
| send | Send mail | 发信 | de, es, ja, pt-BR |
| sender_access | Sender access | 发件权限 | de, es, ja, pt-BR |
| settings | Account and security settings | 账号与风控设置 | de, es, ja, pt-BR |
| sub_admin | Sub-admins and quota | 子管理与额度 | de, es, ja, pt-BR |
| ai_advisor | AI advisor | AI 顾问 | de, es, ja, pt-BR |
| telegram | Telegram | Telegram | de, es, ja, pt-BR |
| statistics | Statistics | 统计 | de, es, ja, pt-BR |
| maintenance | Maintenance | 系统维护 | de, es, ja, pt-BR |
| appearance | Appearance | 外观 | de, es, ja, pt-BR |
| self_service | Mailbox extras | 邮箱自助 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.list

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | List mailboxes | 查看邮箱列表 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.credential

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View credentials | 查看凭证 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.create

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Create mailbox | 创建邮箱 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.password

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Change password | 改密码 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.delete

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Delete mailbox | 删除邮箱 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.clear_inbox

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Clear inbox | 清空收件箱 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.clear_sent

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Clear sent items | 清空发件记录 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.group

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | Read groups | 查看分组 | de, es, ja, pt-BR |
| write | Manage groups | 管理分组 | de, es, ja, pt-BR |

## components.ApiTokens.scope.address.note

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Edit notes | 改备注 | de, es, ja, pt-BR |

## components.ApiTokens.scope.mail.inbox

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | Read inbox | 查看收件 / 读信 | de, es, ja, pt-BR |
| write | Delete inbox mail | 删除收件 | de, es, ja, pt-BR |

## components.ApiTokens.scope.mail.unknown

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | Read unknown mail | 查看未知邮件 | de, es, ja, pt-BR |

## components.ApiTokens.scope.mail.sendbox

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | Read sent mail | 查看发件箱 | de, es, ja, pt-BR |
| write | Delete sent mail | 删除发件记录 | de, es, ja, pt-BR |

## components.ApiTokens.scope.send.mail

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Send mail | 发送邮件 | de, es, ja, pt-BR |

## components.ApiTokens.scope.send.request

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Request send access | 申请发信权限 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sender_access.list

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View sender access | 查看发件权限 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sender_access.update

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Edit sender access | 改发件权限 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sender_access.delete

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Remove sender access | 删除发件权限 | de, es, ja, pt-BR |

## components.ApiTokens.scope.settings.account

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View account settings | 查看账号设置 | de, es, ja, pt-BR |
| write | Save account settings | 保存账号设置 | de, es, ja, pt-BR |

## components.ApiTokens.scope.settings.ip

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View IP blacklist | 查看 IP 黑名单 | de, es, ja, pt-BR |
| write | Save IP blacklist | 保存 IP 黑名单 | de, es, ja, pt-BR |

## components.ApiTokens.scope.settings.webhook

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View webhook allowlist | 查看 Webhook 白名单 | de, es, ja, pt-BR |
| write | Save webhook allowlist | 保存 Webhook 白名单 | de, es, ja, pt-BR |

## components.ApiTokens.scope.settings.mail_webhook

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View mail webhook | 查看邮件 Webhook | de, es, ja, pt-BR |
| write | Save mail webhook | 保存邮件 Webhook | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.list

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | List sub-admins | 查看子管理 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.ledger

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View quota ledger | 查看额度流水 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.costs

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View domain costs | 查看域名单价 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.manage

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Manage sub-admins | 管子管理账号 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.quota

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Adjust quota | 加减额度 | de, es, ja, pt-BR |

## components.ApiTokens.scope.sub_admin.costs

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| write | Save domain costs | 保存域名单价 | de, es, ja, pt-BR |

## components.ApiTokens.scope.ai_advisor

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View advisor | 查看顾问配置 | de, es, ja, pt-BR |
| write | Use advisor | 使用顾问 | de, es, ja, pt-BR |

## components.ApiTokens.scope.ai_advisor.policy

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View advisor policy | 查看顾问策略 | de, es, ja, pt-BR |
| write | Save advisor policy | 保存顾问策略 | de, es, ja, pt-BR |

## components.ApiTokens.scope.telegram

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View Telegram | 查看 Telegram | de, es, ja, pt-BR |
| write | Save Telegram | 保存 Telegram | de, es, ja, pt-BR |

## components.ApiTokens.scope.statistics

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View statistics | 查看统计 | de, es, ja, pt-BR |

## components.ApiTokens.scope.maintenance

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View maintenance | 查看维护信息 | de, es, ja, pt-BR |
| write | Run maintenance | 执行维护 | de, es, ja, pt-BR |

## components.ApiTokens.scope.appearance

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View appearance prefs | 查看外观全局开关 | de, es, ja, pt-BR |
| write | Save appearance prefs | 保存外观全局开关 | de, es, ja, pt-BR |

## components.ApiTokens.scope.self_service

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| read | View mailbox extras | 查看自动回复 / Webhook / S3 | de, es, ja, pt-BR |
| write | Change mailbox extras | 改自动回复 / Webhook / S3 | de, es, ja, pt-BR |

## views.admin.Account

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| owner | Created By | 开号人 | de, es, ja, pt-BR |
| ownerMain | Main admin | 主管理员 | de, es, ja, pt-BR |
| ownerSub | Sub admin | 子管理员 | de, es, ja, pt-BR |
| expires_at | Expires At | 到期时间 | de, es, ja, pt-BR |
| multiSettings | Batch Settings | 批量改设置 | de, es, ja, pt-BR |
| multiSettingsTip | Reset password for selected addresses. Requests run one by one. | 为选中的邮箱重置密码。请求会逐个发送，不会一次打几千条。 | de, es, ja, pt-BR |
| editNote | Note | 备注 | de, es, ja, pt-BR |
| note | Note | 备注 | de, es, ja, pt-BR |
| notePlaceholder | Optional. Shown in the name column for you only. | 可选。只有你自己能看见，有备注时名称栏显示备注。 | de, es, ja, pt-BR |
| saveNote | Save note | 保存备注 | de, es, ja, pt-BR |
| allGroups | All groups | 全部分组 | de, es, ja, pt-BR |

## views.admin.AddressGroups

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| actions | Actions | 操作 | de, es, ja, pt-BR |
| addMember | Add mailboxes | 加入邮箱 | de, es, ja, pt-BR |
| create | Create group | 新建分组 | de, es, ja, pt-BR |
| created_at | Created At | 创建时间 | de, es, ja, pt-BR |
| delete | Delete | 删除 | de, es, ja, pt-BR |
| deleteConfirm | Delete group {name}? | 确定删除分组 {name}？ | de, es, ja, pt-BR |
| emptyMembers | No mailboxes in this group | 这个分组还没有邮箱 | de, es, ja, pt-BR |
| limitsTip | Main admin has no group cap. These numbers only limit sub-admins and mailbox users. | 主管理分组不限个数。这里只改子管理和邮箱用户的上限。 | de, es, ja, pt-BR |
| memberCount | Members | 邮箱数 | de, es, ja, pt-BR |
| members | Members | 成员 | de, es, ja, pt-BR |
| name | Name | 名称 | de, es, ja, pt-BR |
| namePlaceholder | Group name | 分组名称 | de, es, ja, pt-BR |
| nameRequired | Enter a group name | 请填写分组名称 | de, es, ja, pt-BR |
| query | Search | 搜索 | de, es, ja, pt-BR |
| remove | Remove | 移出 | de, es, ja, pt-BR |
| rename | Rename | 改名 | de, es, ja, pt-BR |
| save | Save | 保存 | de, es, ja, pt-BR |
| saveLimits | Save limits | 保存上限 | de, es, ja, pt-BR |
| searchAddress | Search mailbox | 搜索邮箱 | de, es, ja, pt-BR |
| subLimit | Sub-admin group limit | 子管理分组上限 | de, es, ja, pt-BR |
| success | Success | 成功 | de, es, ja, pt-BR |
| tip | Groups and notes are private to the current login. | 分组和备注只属于当前登录身份，别人看不见。 | de, es, ja, pt-BR |
| unlimitedUsed | Used {used}, no cap | 已用 {used} 个，不限上限 | de, es, ja, pt-BR |
| usedOfMax | Used {used} / {max} | 已用 {used} / {max} | de, es, ja, pt-BR |
| userLimit | Mailbox user group limit | 邮箱用户分组上限 | de, es, ja, pt-BR |

## views.index.LocalAddress

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| multiDelete | Remove Selected | 批量移除 | de, es, ja, pt-BR |
| multiDeleteTip | Remove selected mailboxes from this browser only. This does not delete them on the server. | 仅从本机列表移除选中邮箱，不会在服务器上删除别人的号。 | de, es, ja, pt-BR |
| multiSettings | Batch Settings | 批量改设置 | de, es, ja, pt-BR |
| multiSettingsTip | Change password for selected local mailboxes. Requests run one by one with each mailbox credential. | 为本地选中的邮箱逐个修改密码，请求按各自凭据循环调用。 | de, es, ja, pt-BR |
| selectAll | Select All | 全选 | de, es, ja, pt-BR |
| unselectAll | Unselect All | 取消全选 | de, es, ja, pt-BR |
| selectedItems | Selected | 已选择 | de, es, ja, pt-BR |
| pleaseSelectAddress | Please select address | 请选择地址 | de, es, ja, pt-BR |
| newPassword | New Password | 新密码 | de, es, ja, pt-BR |
| newPasswordRequired | Please enter a new password | 请输入新密码 | de, es, ja, pt-BR |
| allGroups | All groups | 全部分组 | de, es, ja, pt-BR |
| editNote | Note | 备注 | de, es, ja, pt-BR |

## views.admin.CreateAccount

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| expireDays | Expire in days | 到期天数 | de, es, ja, pt-BR |
| expireDaysSubTip | Sub admins can set at most 90 days. | 子管理员最长可设置 90 天。 | de, es, ja, pt-BR |
| note | Note | 备注 | de, es, ja, pt-BR |
| notePlaceholder | Optional private note | 可选，仅自己可见的备注 | de, es, ja, pt-BR |
| group | Group | 分组 | de, es, ja, pt-BR |
| groupAuto | Auto by creator | 按开号人自动分组 | de, es, ja, pt-BR |

## views.common.Appearance

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| autoLoadRemoteImages | Automatically load external images in mail body | 自动加载邮件正文中的外部图片 | de, es, ja, pt-BR |
| hideAboutTitle | Hide About and GitHub links | 隐藏「关于」与跳转入口 | de, es, ja, pt-BR |
| hideAboutDesc | Controls the About tab, Header version/GitHub button, and the GitHub link. Hidden items are removed from the DOM so neighboring tabs shift in. | 控制「关于」页、页头版本号/GitHub 按钮，以及 GitHub 跳转。隐藏后从页面移除，旁边的选项会自动靠拢。 | de, es, ja, pt-BR |
| hideAboutMain | Hide for main admin | 对主管理员隐藏 | de, es, ja, pt-BR |
| hideAboutSub | Hide for sub-admin | 对子管理员隐藏 | de, es, ja, pt-BR |
| hideAboutUser | Hide for mailbox users | 对个人用户（邮箱登录）隐藏 | de, es, ja, pt-BR |
| successTip | Success | 成功 | de, es, ja, pt-BR |

## views.common.Login

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| addMailbox | Add Mailbox | 添加邮箱 | de, es, ja, pt-BR |

## views.common.EnterpriseLogin

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| companyNameFallback | 企业邮箱管理平台 | 企业邮箱管理平台 | de, es, ja, pt-BR |
| brandTitle | 企业邮箱管理平台 | 企业邮箱管理平台 | de, es, ja, pt-BR |
| brandSubtitle | A secure, self-hosted mail system on your own domain. Admins provision team mailboxes in seconds. | 安全、自托管的企业邮件系统，基于你自己的域名，由管理员为团队开通邮箱。 | de, es, ja, pt-BR |
| brandPoint1 | Admins provision mailboxes on your domain | 在自有域名下由管理员批量开通邮箱 | de, es, ja, pt-BR |
| brandPoint2 | Each mailbox has its own retention and access control | 每个邮箱独立的保留期与访问控制 | de, es, ja, pt-BR |
| brandPoint3 | Runs entirely on Cloudflare Workers | 完全运行在 Cloudflare Workers 之上 | de, es, ja, pt-BR |
| brandFoot | 版权所有 ©2026-2030 企业邮箱转发 | 版权所有 ©2026-2030 企业邮箱转发 | de, es, ja, pt-BR |
| loginTitle | Sign in | 登录 | de, es, ja, pt-BR |
| loginSubtitle | Sign in to your mailbox, or open the admin console. | 登录你的邮箱，或进入管理员控制台。 | de, es, ja, pt-BR |
| employeeTab | Mailbox Login | 邮箱登录 | de, es, ja, pt-BR |
| adminTab | Admin | 管理员 | de, es, ja, pt-BR |
| emailLabel | Email address | 邮箱地址 | de, es, ja, pt-BR |
| emailPlaceholder | Enter your email | 请输入邮箱 | de, es, ja, pt-BR |
| passwordLabel | Password | 密码 | de, es, ja, pt-BR |
| passwordPlaceholder | Enter your password | 请输入密码 | de, es, ja, pt-BR |
| credentialLabel | Mailbox credential | 邮箱凭据 | de, es, ja, pt-BR |
| credentialPlaceholder | Paste the JWT credential | 请粘贴 JWT 凭据 | de, es, ja, pt-BR |
| usernameLabel | Username | 用户名 | de, es, ja, pt-BR |
| usernamePlaceholder | Enter admin username | 请输入管理员账号 | de, es, ja, pt-BR |
| loginEmail | Sign in to mailbox | 登录邮箱 | de, es, ja, pt-BR |
| loginAdmin | Open admin console | 进入管理控制台 | de, es, ja, pt-BR |
| credentialLogin | Use credential instead | 改用凭据登录 | de, es, ja, pt-BR |
| passwordLogin | Use password instead | 改用密码登录 | de, es, ja, pt-BR |
| adminHint | Both username and password are verified. | 用户名和密码都会校验。 | de, es, ja, pt-BR |
| employeeHint | Sign in with the mailbox and password assigned by an admin. | 使用管理员分配给你的邮箱与密码登录。 | de, es, ja, pt-BR |
| emailPasswordRequired | Email and password are required | 邮箱和密码不能为空 | de, es, ja, pt-BR |
| adminRequired | Username and password are required | 用户名和密码不能为空 | de, es, ja, pt-BR |
| credentialInput | Please paste the mailbox credential | 请输入邮箱地址凭据 | de, es, ja, pt-BR |
| loginFailed | Login failed | 登录失败 | de, es, ja, pt-BR |

## views.admin.SubAdmins

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| tip | Create sub-admin accounts, add quota, change passwords, enable or disable access, and delete accounts. | 开子管理员账号、加积分、改密码、启用/禁用，以及删除。 | de, es, ja, pt-BR |
| create | Create | 开账号 | de, es, ja, pt-BR |
| username | Username | 用户名 | de, es, ja, pt-BR |
| password | Password | 密码 | de, es, ja, pt-BR |
| quotaBalance | Quota | 剩余积分 | de, es, ja, pt-BR |
| initialQuota | Initial quota | 初始积分 | de, es, ja, pt-BR |
| enabled | Enabled | 启用 | de, es, ja, pt-BR |
| created_at | Created At | 创建时间 | de, es, ja, pt-BR |
| actions | Actions | 操作 | de, es, ja, pt-BR |
| addQuota | Add quota | 加积分 | de, es, ja, pt-BR |
| changePassword | Change password | 改密码 | de, es, ja, pt-BR |
| newPassword | New password | 新密码 | de, es, ja, pt-BR |
| pleaseInputPassword | Please enter a new password | 请输入新密码 | de, es, ja, pt-BR |
| enable | Enable | 启用 | de, es, ja, pt-BR |
| disable | Disable | 禁用 | de, es, ja, pt-BR |
| enabledOn | On | 开 | de, es, ja, pt-BR |
| enabledOff | Off | 关 | de, es, ja, pt-BR |
| delete | Delete | 删除 | de, es, ja, pt-BR |
| deleteConfirm | Delete sub-admin {username}? | 确定删除子管理员 {username}？ | de, es, ja, pt-BR |
| deleteConfirmTip | If this sub-admin still owns mailboxes, deletion will be refused. | 若该子管理仍有邮箱，将无法删除。 | de, es, ja, pt-BR |
| quotaDelta | Quota change | 积分变动 | de, es, ja, pt-BR |
| quotaDeltaTip | Use a positive number to add quota. | 正数为充值积分。 | de, es, ja, pt-BR |
| pleaseInput | Please fill in all fields | 请填写完整信息 | de, es, ja, pt-BR |
| invalidQuota | Enter a non-zero quota change | 请输入非零的积分变动 | de, es, ja, pt-BR |
| success | Success | 成功 | de, es, ja, pt-BR |
| save | Save | 保存 | de, es, ja, pt-BR |

## views.admin.DomainCreateCosts

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| tip | Cost charged to a sub admin when creating a mailbox on each domain. Default is 1. | 子管理员在各域名下开邮箱时扣除的积分，默认 1。 | de, es, ja, pt-BR |
| save | Save | 保存 | de, es, ja, pt-BR |
| success | Success | 成功 | de, es, ja, pt-BR |
| noDomains | No domains configured | 尚未配置域名 | de, es, ja, pt-BR |

## components.UsageGuide

| key | en 参照 | zh 参照 | 缺失语言 |
|---|---|---|---|
| title | Quick start | 使用引导 | de, es, ja, pt-BR |
| adminStep1 | Create a mailbox in the account list and set expire days. | 在账号列表中开通邮箱，并填写到期天数。 | de, es, ja, pt-BR |
| adminStep2 | Give the address and password to the user. | 把邮箱地址和密码发给使用者。 | de, es, ja, pt-BR |
| adminStep3 | The user signs in with Mailbox Login, then adds more mailboxes and uses AI extract or JWT credentials as needed. | 使用者用「邮箱登录」进入个人工作台，可添加多个邮箱，并在账户设置中查看 AI 提取与 Agent 凭据用法。 | de, es, ja, pt-BR |
| personalStep1 | Sign in with the mailbox and password assigned by an admin. | 使用管理员分配的邮箱地址和密码登录。 | de, es, ja, pt-BR |
| personalStep2 | Open Address Manage to add more mailboxes and switch between them. Batch remove only deletes local list items. | 在「地址管理」中添加多个邮箱并切换。批量移除只会从本机列表去掉，不会删服务器上的号。 | de, es, ja, pt-BR |
| personalStep3 | Open account settings for JWT credentials, AI extract, Telegram, or the auto-login link /?jwt=. | 在账户设置中查看 JWT 凭据、AI 提取、Telegram，或使用 JWT 深链 /?jwt= 自动登录。 | de, es, ja, pt-BR |

共 287 个缺失键。
