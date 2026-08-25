[English](./README.md) · [中文](./README.zh-CN.md) · **Español** · [Português (Brasil)](./README.pt-BR.md) · [日本語](./README.ja.md) · [Deutsch](./README.de.md)

<img src="docs/brand/logo.png" width="100" alt="Enterprise Post Office-Cloudflare" />

# Enterprise Post Office-**Cloudflare**

**Sin necesidad de servidor propio. Una oficina de correo empresarial completa y estable que se ejecuta en el ecosistema de Cloudflare.**

![Version](https://img.shields.io/badge/version-v1.0-0B1F3A)
![License](https://img.shields.io/badge/license-MIT-3DDC97)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)
![Vue 3](https://img.shields.io/badge/UI-Vue%203-42b883?logo=vuedotjs)

[Puntos destacados](#puntos-destacados) · [El derecho de crear cuentas es el producto](#el-derecho-de-crear-cuentas-es-el-producto) · [Inicio rápido](#inicio-rápido) · [Por qué correo empresarial](#por-qué-correo-empresarial) · [Arquitectura](#arquitectura) · [English](README.md) · [中文](README.zh-CN.md) · [Português](README.pt-BR.md) · [日本語](README.ja.md) · [Deutsch](README.de.md)

Mantenedor: [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf) · Co-creado con: [Claude Code](https://www.anthropic.com/claude-code)

La oficina de correos empresarial se ejecuta exclusivamente en Cloudflare: Workers actúa como mostrador, D1 como libro mayor y Email Routing como muelle de recepción. Sin comprar servidores ni mantener infraestructura de correo. El dominio recibe correos y, una vez autorizado, puede enviar.

Esto no es un correo temporal. Cada dirección tiene su propia contraseña en este sistema, permitiendo iniciar sesión, recibir y enviar como un portal de correo completo. La creación de cuentas se realiza únicamente desde el panel de administración: el administrador principal supervisa todo el sitio, el subadministrador solo crea y gestiona sus propios buzones, y los usuarios acceden con su dirección y contraseña sin poder registrarse libremente.

El sistema emite tokens de API completos para cada rol con los mismos permisos que la interfaz web. La página de creación de tokens incluye su propia documentación; envíe ese documento directamente a una IA para automatizar la recepción, el envío y la gestión sin necesidad de revisar el código fuente. La interfaz pública no permite la auto-creación — `POST /api/new_address` responde siempre 403.

![Página de inicio de sesión: usuario o administrador](docs/screenshots/i18n/login-es.png)

La página de inicio de sesión separa a los usuarios de buzón de los administradores.

## Puntos destacados

- **Sin necesidad de servidor propio:** Se ejecuta en el ecosistema de Cloudflare sin configurar MTA. Worker + D1 + Email Routing conforman la oficina de correos.
- **Portal de correo completo, no correo temporal:** El sistema permite recibir y enviar correos; cada dirección cuenta con contraseña propia en lugar de ser una dirección desechable.
- **Tres niveles de identidad, gestión sencilla:** El administrador principal supervisa todo, el subadministrador gestiona sus buzones asignados y los usuarios acceden con su dirección y contraseña.
- **Excelente compatibilidad con protocolos de automatización e IA:** Cada rol puede emitir tokens de API con los mismos permisos que la interfaz web. La documentación de API se incluye directamente en la página de tokens. Docs: [`mailbox-user.md`](frontend/public/api-docs/mailbox-user.md) / [`main-admin.md`](frontend/public/api-docs/main-admin.md) / [`sub-admin.md`](frontend/public/api-docs/sub-admin.md).
- **Creación de cuentas exclusiva de administradores:** `POST /api/new_address` devuelve **403** permanentemente.
- **Implementación asistida por IA:** Copie el prompt a continuación para que un agente de IA configure y despliegue el sistema paso a paso tras verificar los tokens.

## El derecho de crear cuentas es el producto

Muchos servicios de correo temporal pueden otorgar una dirección. La oficina de correos empresarial controla quién tiene derecho a abrir buzones, quién solo puede utilizarlos y si el envío está habilitado. El control permanece con usted, ejecutándose en Cloudflare.

> **En resumen:** Solo necesita una cuenta de Cloudflare y un dominio para recibir correos. La oficina postal gestiona la recepción y el envío según permisos. Cada buzón tiene contraseña propia. Las solicitudes públicas anónimas quedan bloqueadas.

Reglas inmutables del producto:

1. `POST /api/new_address` devuelve siempre **403**.
2. El administrador principal accede con `ADMIN_USERNAME` / `ADMIN_PASSWORD`, crea buzones sin límite de puntos, gestiona subadministradores, cuotas, remitentes y apariencia.
3. El subadministrador gestiona únicamente **sus propios** buzones, con deducción de puntos por dominio y validez de hasta 90 días.
4. El usuario del buzón inicia sesión con `usuario@dominio` + contraseña (o JWT de dirección) para leer y enviar correo permitido.
5. Cada dominio de recepción debe tener habilitado Catch-all en Email Routing apuntando a este Worker.
6. La zona DNS y el Worker deben residir en la **misma** cuenta de Cloudflare.
7. Tokens, contraseñas y Account ID deben mantenerse en secrets o panel de control, nunca en git.
8. Revocar los tokens de API temporales una vez completado el despliegue.

## Inicio rápido

Entregue este repositorio a Claude, ChatGPT o Cursor y pegue el siguiente texto:

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

## Arquitectura del sistema

- **Cloudflare Workers:** Enrutamiento HTTP, lógica de negocio y despacho de correo.
- **Cloudflare D1:** Base de datos relacional SQLite distribuida.
- **Cloudflare Email Routing:** Enrutamiento de correo entrante hacia el Worker.
- **Frontend Vue 3:** Compilado e integrado en el Worker a través del binding `[assets]`.

## Licencia

[MIT](LICENSE). Versión v1.0.

MIT © [hiFOFA](https://github.com/hiFOFA/enterprise-post-office-cf). Upstream: [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email).
