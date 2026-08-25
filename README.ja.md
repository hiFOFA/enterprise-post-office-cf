[English](./README.md) · [中文](./README.zh-CN.md) · [Español](./README.es.md) · [Português (Brasil)](./README.pt-BR.md) · **日本語** · [Deutsch](./README.de.md)

<img src="docs/brand/logo.png" width="100" alt="Enterprise Post Office-Cloudflare" />

# Enterprise Post Office-**Cloudflare**

**自前サーバー不要。Cloudflare エコシステム上で稼働する完全かつ安定した企業向けメールシステム。**

![Version](https://img.shields.io/badge/version-v1.0-0B1F3A)
![License](https://img.shields.io/badge/license-MIT-3DDC97)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)
![Vue 3](https://img.shields.io/badge/UI-Vue%203-42b883?logo=vuedotjs)

[主な特徴](#主な特徴) · [アカウント開設権こそが製品の本質](#アカウント開設権こそが製品の本質) · [クイックスタート](#クイックスタート) · [なぜ企業メールが必要か](#なぜ企业メールが必要か) · [システム構成](#システム構成) · [English](README.md) · [中文](README.zh-CN.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Deutsch](README.de.md)

メンテナー: [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf) · 共同開発: [Claude Code](https://www.anthropic.com/claude-code)

企業ポストオフィスは Cloudflare 上でのみ動作します：Workers が窓口、D1 が台帳、Email Routing が受信ゲートウェイとして機能します。サーバーの購入やメールサーバーの保守は一切不要です。独自ドメインでメールを受信し、権限付与後に送信も行えます。

これは使い捨ての一時メール（Temp Mail）ではありません。すべてのメールアドレスに個別のパスワードが設定され、ログイン、送受信が可能な本格的なメールポータルです。アカウント開設は管理コンソールからのみ行われます：メイン管理者は全体を統括し、サブ管理者は自身の割り当てられたボックスのみを開設・管理、一般ユーザーはアドレスとパスワードで自身の受信箱にログインし、勝手に新規登録することはできません。

各ロールには Web 画面と同等の操作権限を持つ完全な API トークンを発行できます。トークン作成画面には仕様ドキュメントが付属しており、そのドキュメントを直接 AI に渡すだけで、ソースコードを読まずに自動送受信やボックス管理の自動化を組み込むことができます。公開エンドポイントからの勝手なアカウント作成は不可 — `POST /api/new_address` は恒久的に 403 を返します。

![ログイン画面：メールボックスユーザーまたは管理者](docs/screenshots/i18n/login-ja.png)

ログイン画面で一般ユーザーと管理者を明確に分離。

## 主な特徴

- **自前サーバー不要：** Cloudflare 上で完結。MTAの構築・運用は不要です。Worker + D1 + Email Routing がポストオフィスを構成します。
- **一時メールではなく完全なメールポータル：** 送受信に対応し、各アドレスにパスワードが存在するため、使い捨てではなく継続利用が可能です。
- **3段階のロール管理：** メイン管理者が全体を管理、サブ管理者が自身のボックスを開設、一般ユーザーはアドレスとパスワードでログイン。開設者と利用者を分離。
- **自動化プロトコルおよび AI 開発への高い親和性：** 各ロールに応じた API トークンを発行可能。トークン作成画面に付属するドキュメントを AI に渡すだけで送受信の自動化が可能。ドキュメント：[`mailbox-user.md`](frontend/public/api-docs/mailbox-user.md) / [`main-admin.md`](frontend/public/api-docs/main-admin.md) / [`sub-admin.md`](frontend/public/api-docs/sub-admin.md)。
- **管理者のみが開設可能：** `POST /api/new_address` は **403** に固定。
- **AI によるデプロイ支援：** 以下のプロンプトを AI に貼り付けることで、手順に沿った安全なデプロイが可能です。

## アカウント開設権こそが製品の本質

多くの一時メールサービスはアドレスを提供するだけです。企業ポストオフィスが真に管理するのは「誰が開設権を持ち、誰が利用のみを行うか、送信を許可するか」という点です。管理権限はお手元に残り、稼働は Cloudflare に委ねられます。

> **端的に言えば：** 必要なのは Cloudflare アカウントと独自ドメインのみ。システムが受信と権限に応じた送信を処理します。各ボックスは個別のパスワードを持ちます。公開 API からの勝手な開設は拒否されます。

製品の基本原則：

1. `POST /api/new_address` は常に **403** を返します。
2. メイン管理者は `ADMIN_USERNAME` / `ADMIN_PASSWORD` でログインし、ポイント無制限で開設、サブ管理者・クォータ・送信権限・外観を設定します。
3. サブ管理者は**自身が作成した**ボックスのみを管理し、ドメインごとにポイントを消費、有効期限は最長90日です。
4. 一般ユーザーは `ユーザー名@ドメイン` + パスワード（またはアドレス JWT）でログインし、閲覧および許可された送信を行います。
5. 各受信ドメインは Email Routing の Catch-all を有効化し、この Worker に向ける必要があります。
6. DNS ゾーンと Worker は**同一の** Cloudflare アカウント内に存在する必要があります。
7. トークン、パスワード、Account ID は secrets またはダッシュボードでのみ管理し、git に含めないでください。
8. デプロイ完了後は、使用した一時 API トークンを直ちに失効させてください。

## クイックスタート

本リポジトリを Claude、ChatGPT、または Cursor に渡し、以下のプロンプトを貼り付けてください：

<p align="center">
  <a href="https://claude.ai"><img src="https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white" alt="Claude" /></a>
  <a href="https://chatgpt.com"><img src="https://img.shields.io/badge/ChatGPT-10A37F?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSJ3aGl0ZSIgcm9sZT0iaW1nIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI%2BPHRpdGxlPk9wZW5BSTwvdGl0bGU%2BPHBhdGggZD0iTTIyLjI4MTkgOS44MjExYTUuOTg0NyA1Ljk4NDcgMCAwIDAtLjUxNTctNC45MTA4IDYuMDQ2MiA2LjA0NjIgMCAwIDAtNi41MDk4LTIuOUE2LjA2NTEgNi4wNjUxIDAgMCAwIDQuOTgwNyA0LjE4MThhNS45ODQ3IDUuOTg0NyAwIDAgMC0zLjk5NzcgMi45IDYuMDQ2MiA2LjA0NjIgMCAwIDAgLjc0MjcgNy4wOTY2IDUuOTggNS45OCAwIDAgMCAuNTExIDQuOTEwNyA2LjA1MSA2LjA1MSAwIDAgMCA2LjUxNDYgMi45MDAxQTUuOTg0NyA1Ljk4NDcgMCAwIDAgMTMuMjU5OSAyNGE2LjA1NTcgNi4wNTU3IDAgMCAwIDUuNzcxOC00LjIwNTggNS45ODk0IDUuOTg5NCAwIDAgMCAzLjk5NzctMi45MDAxIDYuMDU1NyA2LjA1NTcgMCAwIDAtLjc0NzUtNy4wNzI5em0tOS4wMjIgMTIuNjA4MWE0LjQ3NTUgNC40NzU1IDAgMCAxLTIuODc2NC0xLjA0MDhsLjE0MTktLjA4MDQgNC43NzgzLTIuNzU4MmEuNzk0OC43OTQ4IDAgMCAwIC4zOTI3LS42ODEzdi02LjczNjlsMi4wMiAxLjE2ODZhLjA3MS4wNzEgMCAwIDEgLjAzOC4wNTJ2NS41ODI2YTQuNTA0IDQuNTA0IDAgMCAxLTQuNDk0NSA0LjQ5NDR6bS05LjY2MDctNC4xMjU0YTQuNDcwOCA0LjQ3MDggMCAwIDEtLjUzNDYtMy4wMTM3bC4xNDIuMDg1MiA0Ljc4MyAyLjc1ODJhLjc3MTIuNzcxMiAwIDAgMCAuNzgwNiAwbDUuODQyOC0zLjM2ODV2Mi4zMzI0YS4wODA0LjA4MDQgMCAwIDEtLjAzMzIuMDYxNUw5Ljc0IDE5Ljk1MDJhNC40OTkyIDQuNDk5MiAwIDAgMS02LjE0MDgtMS42NDY0ek0yLjM0MDggNy44OTU2YTQuNDg1IDQuNDg1IDAgMCAxIDIuMzY1NS0xLjk3MjhWMTEuNmEuNzY2NC43NjY0IDAgMCAwIC4zODc5LjY3NjVsNS44MTQ0IDMuMzU0My0yLjAyMDEgMS4xNjg1YS4wNzU3LjA3NTcgMCAwIDEtLjA3MSAwbC00LjgzMDMtMi43ODY1QTQuNTA0IDQuNTA0IDAgMCAxIDIuMzQwOCA3Ljg3MnptMTYuNTk2MyAzLjg1NThMMTMuMTAzOCA4LjM2NCAxNS4xMTkyIDcuMmEuMDc1Ny4wNzU3IDAgMCAxIC4wNzEgMGw0LjgzMDMgMi43OTEzYTQuNDk0NCA0LjQ5NDQgMCAwIDEtLjY3NjUgOC4xMDQydi01LjY3NzJhLjc5Ljc5IDAgMCAwLS40MDctLjY2N3ptMi4wMTA3LTMuMDIzMWwtLjE0Mi0uMDg1Mi00Ljc3MzUtMi43ODE4YS43NzU5Ljc3NTkgMCAwIDAtLjc4NTQgMEw5LjQwOSA5LjIyOTdWNi44OTc0YS4wNjYyLjA2NjIgMCAwIDEgLjAyODQtLjA2MTVsNC44MzAzLTIuNzg2NmE0LjQ5OTIgNC40OTkyIDAgMCAxIDYuNjgwMiA0LjY2ek04LjMwNjUgMTIuODYzbC0yLjAyLTEuMTYzOGEuMDgwNC4wODA0IDAgMCAxLS4wMzMyLS4wNjE1VjkuMzA1M2w0LjgzMDIgMi43ODY2YTQuNTA0IDQuNTA0IDAgMCAxIC0yLjc3NyAxLjg3MXptLTEuMDM1NS0zLjgwNTRsLTUuODI4Ni0zLjM2MjRhLjc5Ljc5IDAgMCAwIC0uMzk4OC0uNjcwOFYyLjQ2NzlhNC40OTkgNC40OTkgMCAwIDEgNC4yMDY4IDEuMTcyOEwxMy4wOCA1LjIzMDVsLTIuMDEgMS4xNjM5YS4wNzU3LjA3NTcgMCAwIDEtLjA3MSAwbC0zLjcyOC0yLjE1MjFhLjc4NTUuNzg1NSAwIDAgMC0uNzg1NSAwIC43ODg1Ljc4ODUgMCAwIDAtLjM5OC42ODF2NC4zMDQ4bDUuODI4NSAzLjM2MjRhLjc4NTUuNzg1NSAwIDAgMCAuNzg1NSAwIC43ODg1Ljc4ODUgMCAwIDAgLjM5OC0uNjgxdi00LjMwNDhsLTIuMDEtMS4xNjM5em0xLjA0NTMtNC45MjQ4bC4xNDItLjA4NTIgNC43NzM1LTIuNzgxOGEuNzc1OS43NzU5IDAgMCAwIC43ODU0IDBMOS40MDkgOS4yMjk3VjYuODk3NGEuMDY2Mi4wNjYyIDAgMCAxIC4wMjg0LS4wNjE1bDQuODMwMy0yLjc4NjZhNC40OTkyIDQuNDk5MiAwIDAgMSA2LjY4MDIgNC42NnpNOC4zMDY1IDEyLjg2M2wtMi4wMi0xLjE2MzhhLjA4MDQuMDgwNCAwIDAgMS0uMDMzMi0uMDYxNVY5LjMwNTNsNC44MzAyIDIuNzg2NmE0LjUwNCA0LjUwNCAwIDAgMS0yLjc3NyAxLjg3MXptLTEuMDM1NS0zLjgwNTRsLTUuODI4Ni0zLjM2MjRhLjc5Ljc5IDAgMCAwLS4zOTg4LS42NzA4VjIuNDY3OWE0LjQ5OSA0LjQ5OSAwIDAgMSA0LjIwNjggMS4xNzI4TDEzLjA4IDUuMjMwNWwtMi4wMSAxLjE2MzlhLjA3NTcuMDc1NyAwIDAgMS0uMDcxIDBsLTMuNzI4LTIuMTUyMWEuNzg1NS43ODU1IDAgMCAwLS43ODU1IDAgLjc4ODUuNzg4NSAwIDAgMC0uMzk4LjY4MXY0LjMwNDhsNS44Mjg1IDMuMzYyNGEuNzg1NS43ODU1IDAgMCAwIC43ODU1IDAgLjc4ODUuNzg4NSAwIDAgMCAuMzk4LS42ODF2LTQuMzA0OGwtMi4wMS0xLjE2Mzl6Ii8+PC9zdmc+" alt="ChatGPT" /></a>
  <a href="https://cursor.com"><img src="https://img.shields.io/badge/Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white" alt="Cursor" /></a>
</p>

```text
请先读取并严格遵守这个技能，然后帮我部署「企业邮箱管理系统」：

https://raw.githubusercontent.com/hiFOFA/enterprise-post-office-cf/main/skills/deploy-cf-post-office/SKILL.md

要求：
1. 先 git clone https://github.com/hiFOFA/enterprise-post-office-cf.git
2. 按技能一项一项问我，收集部署需要的信息
3. 每要一个令牌，都用白话说明它用来干什么；并说明令牌只保存在本次会话，不会写入仓库
4. 问我站点用 Worker 自带的 workers.dev，还是我提供的、已在 Cloudflare 上的域名
5. 令牌验证通过后再部署，不要跳步
6. 完成后只告诉我访问域名；提醒我立刻到 Cloudflare 仪表盘撤销刚才发给你的 API 令牌
```

## システム構成

- **Cloudflare Workers:** HTTP ルーティング、ビジネスロジック、メール処理。
- **Cloudflare D1:** 分散 SQLite リレーショナルデータベース。
- **Cloudflare Email Routing:** 受信メールを Worker に転送。
- **Vue 3 フロントエンド:** ビルドされ `[assets]` バインディングを通じて Worker に統合。

## ライセンス

[MIT](LICENSE). バージョン v1.0。

MIT © [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf). Upstream: [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email).
