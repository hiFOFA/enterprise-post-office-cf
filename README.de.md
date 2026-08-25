[English](./README.md) · [中文](./README.zh-CN.md) · [Español](./README.es.md) · [Português (Brasil)](./README.pt-BR.md) · [日本語](./README.ja.md) · **Deutsch**

<img src="docs/brand/logo.png" width="100" alt="Enterprise Post Office-Cloudflare" />

# Enterprise Post Office-**Cloudflare**

**Kein eigener Server erforderlich. Ein vollständiges, stabiles Unternehmens-Postamt, das auf dem Cloudflare-Ökosystem läuft.**

![Version](https://img.shields.io/badge/version-v1.0-0B1F3A)
![License](https://img.shields.io/badge/license-MIT-3DDC97)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)
![Vue 3](https://img.shields.io/badge/UI-Vue%203-42b883?logo=vuedotjs)

[Highlights](#highlights) · [Das Recht zur Kontoerstellung ist das Produkt](#das-recht-zur-kontoerstellung-ist-das-produkt) · [Schnellstart](#schnellstart) · [Warum Unternehmens-Postamt](#warum-unternehmens-postamt) · [Systemarchitektur](#systemarchitektur) · [English](README.md) · [中文](README.zh-CN.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md)

Maintainer: [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf) · Mitentwickelt von: [Claude Code](https://www.anthropic.com/claude-code)

Das Unternehmens-Postamt läuft ausschließlich auf Cloudflare: Workers als Schalter, D1 als Hauptbuch und Email Routing als Eingangsdock. Kein Kauf von Servern, kein Betrieb eigener Mailserver. Die Domain empfängt E-Mails und kann nach Freigabe senden.

Dies ist keine temporäre Wegwerf-Mailadresse. Jede Adresse hat in diesem System ein eigenes Passwort und fungiert als vollständiges E-Mail-Portal mit Login, Empfang und Versand. Die Kontoerstellung erfolgt ausschließlich über die Administration: Der Hauptadministrator überwacht die gesamte Instanz, Sub-Administratoren erstellen und verwalten nur ihre eigenen Postfächer, und Postfachbenutzer melden sich mit Adresse und Passwort an, ohne sich selbst registrieren zu können.

Das System stellt für jede Rolle vollständige API-Token bereit, deren Berechtigungen mit der Weboberfläche übereinstimmen. Die Token-Erstellungsseite enthält eine eigene Dokumentation; übergeben Sie dieses Dokument direkt an eine KI, um Empfang, Versand und Postfachverwaltung ohne Quellcode-Recherche zu automatisieren. Die öffentliche API erlaubt keine Selbsterstellung — `POST /api/new_address` antwortet dauerhaft mit 403.

![Anmeldeseite: Postfachbenutzer oder Administrator](docs/screenshots/i18n/login-de.png)

Die Anmeldeseite trennt Postfachbenutzer von Administratoren.

## Highlights

- **Kein eigener Server erforderlich:** Läuft auf dem Cloudflare-Stack ohne eigenen MTA. Worker + D1 + Email Routing bilden das Postamt.
- **Vollständiges E-Mail-Portal, keine Wegwerf-Mail:** Unterstützt Empfang und Versand; jedes Postfach besitzt ein eigenes Passwort statt einer flüchtigen Adresse.
- **Dreistufige Rollenhierarchie, einfache Verwaltung:** Der Hauptadministrator verwaltet alles, Sub-Admins verwalten zugewiesene Postfächer, Benutzer melden sich mit Adresse und Passwort an.
- **Hervorragende Kompatibilität mit Automatisierung und KI:** Jede Rolle kann API-Token mit Web-äquivalenten Berechtigungen erstellen. Dokumentation ist direkt in der Token-Ansicht verfügbar. Docs: [`mailbox-user.md`](frontend/public/api-docs/mailbox-user.md) / [`main-admin.md`](frontend/public/api-docs/main-admin.md) / [`sub-admin.md`](frontend/public/api-docs/sub-admin.md).
- **Kontoerstellung nur durch Administratoren:** `POST /api/new_address` ist fest auf **403** verdrahtet.
- **KI-gestützte Bereitstellung:** Kopieren Sie den Prompt unten, damit ein KI-Agent die Bereitstellung nach Überprüfung der Token schrittweise ausführt.

## Das Recht zur Kontoerstellung ist das Produkt

Viele temporäre Maildienste bieten lediglich eine Adresse. Das Unternehmens-Postamt steuert, wer Postfächer eröffnen darf, wer sie nur nutzt und ob das Senden erlaubt ist. Die Kontrolle bleibt bei Ihnen, während der Betrieb auf Cloudflare läuft.

> **Kurz gesagt:** Sie benötigen lediglich ein Cloudflare-Konto und eine Empfangsdomain. Das Postamt übernimmt Empfang und autorisierten Versand. Jedes Postfach hat ein eigenes Passwort. Anonyme Erstellungsanfragen werden abgewiesen.

Unveränderliche Regeln des Produkts:

1. `POST /api/new_address` gibt immer **403** zurück.
2. Der Hauptadministrator meldet sich mit `ADMIN_USERNAME` / `ADMIN_PASSWORD` an, erstellt Postfächer ohne Punktekosten, verwaltet Sub-Admins, Kontingente, Absenderberechtigungen und Aussehen.
3. Sub-Administratoren verwalten ausschließlich **ihre eigenen** Postfächer mit Punkteabzug pro Domain und einer Gültigkeit von bis zu 90 Tagen.
4. Postfachbenutzer melden sich mit `name@domain` + Passwort (oder Adress-JWT) an, um Mails zu lesen und berechtigte Mails zu senden.
5. Jede Empfangsdomain muss Catch-all in Email Routing aktivieren und auf diesen Worker verweisen.
6. Die DNS-Zone und der Worker müssen sich im **selben** Cloudflare-Konto befinden.
7. Token, Passwörter und Account ID gehören in secrets oder das Dashboard, niemals in git.
8. Nach Abschluss der Bereitstellung temporäre API-Token umgehend widerrufen.

## Schnellstart

Übergeben Sie dieses Repository an Claude, ChatGPT oder Cursor und fügen Sie folgenden Prompt ein:

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

## Systemarchitektur

- **Cloudflare Workers:** HTTP-Routing, Geschäftslogik und E-Mail-Verarbeitung.
- **Cloudflare D1:** Verteilte relationale SQLite-Datenbank.
- **Cloudflare Email Routing:** Leitet eingehende E-Mails an den Worker weiter.
- **Vue 3 Frontend:** Gebaut und über das `[assets]`-Binding in den Worker integriert.

## Lizenz

[MIT](LICENSE). Version v1.0.

MIT © [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf). Upstream: [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email).
