import { Context, Hono } from 'hono'
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt'

import { api as commonApi } from './commom_api';
import { api as openAuthApi } from './open_api/auth';
import { api as mailsApi } from './mails_api'
import { api as adminApi } from './admin_api';
import { api as apiSendMail } from './mails_api/send_mail_api'
import { api as telegramApi } from './telegram_api'

import i18n from './i18n';
import { email } from './email';
import { scheduled } from './scheduled';
import { getPasswords, getBooleanValue, getDomains } from './utils';
import { checkAccessControl } from './ip_blacklist';
import { ADDRESS_ACTIVE_SQL } from './common';
import { authenticateAdmin, getMainAdminUsername } from './admin_auth';
import { isForbiddenForSubAdmin } from './admin_quota';
import { tryAuthenticateApiToken } from './api_token';
import { withUtf8Charset } from './http_headers';

const applyUtf8Charset = (res: Response): Response => {
	const current = res.headers.get('Content-Type');
	const next = withUtf8Charset(current);
	if (!next || next === current) return res;
	const headers = new Headers(res.headers);
	headers.set('Content-Type', next);
	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers,
	});
};

const API_PATHS = [
	"/api/",
	"/open_api/",
	"/admin/",
	"/telegram/",
];

const app = new Hono<HonoCustomType>()
//cors
app.use('/*', cors());
// error handler
app.onError((err, c) => {
	console.error(err)
	return c.text(`${err.name} ${err.message}`, 500)
})
// global middlewares
app.use('/*', async (c, next) => {

	// check if the request is for static files
	if (c.env.ASSETS && !API_PATHS.some(path => c.req.path.startsWith(path))) {
		const url = new URL(c.req.raw.url);
		if (!url.pathname.includes('.')) {
			url.pathname = ""
		}
		return c.env.ASSETS.fetch(url);
	}

	// save language in context
	const lang = c.req.raw.headers.get("x-lang");
	if (lang) { c.set("lang", lang); }
	const msgs = i18n.getMessages(lang || c.env.DEFAULT_LANG);

	// check header x-custom-auth
	const passwords = getPasswords(c);
	if (!c.req.path.startsWith("/open_api") && !c.req.path.startsWith("/telegram/") && passwords && passwords.length > 0) {
		const auth = c.req.raw.headers.get("x-custom-auth");
		if (!auth || !passwords.includes(auth)) {
			return c.text(msgs.CustomAuthPasswordMsg, 401)
		}
	}

	// rate limit for specific endpoints
	if (
		c.req.path.startsWith("/api/new_address")
		|| c.req.path.startsWith("/api/send_mail")
	) {
		const reqIp = c.req.raw.headers.get("cf-connecting-ip")
		if (reqIp && c.env.RATE_LIMITER) {
			const { success } = await c.env.RATE_LIMITER.limit(
				{ key: `${c.req.path}|${reqIp}` }
			)
			if (!success) {
				return c.text(`IP=${reqIp} Rate limit exceeded for ${c.req.path}`, 429)
			}
		}
		// Check access control (blacklist and daily limit)
		const accessControlResponse = await checkAccessControl(c);
		if (accessControlResponse) {
			return accessControlResponse;
		}
	}
	// webhook check
	if (
		c.req.path.startsWith("/api/webhook")
		|| c.req.path.startsWith("/admin/webhook")
		|| c.req.path.startsWith("/admin/mail_webhook")
	) {
		if (!c.env.KV) {
			return c.text(msgs.KVNotAvailableMsg, 400);
		}
		if (!getBooleanValue(c.env.ENABLE_WEBHOOK)) {
			return c.text(msgs.WebhookNotEnabledMsg, 403);
		}
	}
	if (!c.env.DB) {
		return c.text(msgs.DBNotAvailableMsg, 400);
	}
	if (!c.env.JWT_SECRET) {
		return c.text(msgs.JWTSecretNotSetMsg, 400);
	}
	await next()
});

// api auth
app.use('/api/*', async (c, next) => {
	if (c.req.path.startsWith("/api/new_address")) {
		const lang = c.get("lang") || c.env.DEFAULT_LANG;
		const msgs = i18n.getMessages(lang);
		return c.text(msgs.NewAddressDisabledMsg, 403);
	}
	if (c.req.path.startsWith("/api/address_login")) {
		await next();
		return;
	}

	const apiTokenAuth = await tryAuthenticateApiToken(c, "user");
	if (apiTokenAuth instanceof Response) return apiTokenAuth;
	if (apiTokenAuth === null) {
		await next();
		return;
	}

	const authorization = c.req.raw.headers.get("Authorization");
	if (!authorization || !authorization.trim()) {
		const lang = c.get("lang") || c.env.DEFAULT_LANG || "zh";
		const msgs = i18n.getMessages(lang);
		return c.text(msgs.MissingTokenMsg, 401);
	}

	try {
		return await jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, async () => {
			const lang = c.get("lang") || c.env.DEFAULT_LANG;
			const msgs = i18n.getMessages(lang);
			const payload = c.get("jwtPayload") as JwtPayload | undefined;
			if (!payload?.address || !payload?.address_id) {
				return c.text(msgs.InvalidAddressCredentialMsg, 401);
			}
			try {
				const row = await c.env.DB.prepare(
					`SELECT id FROM address WHERE id = ? AND name = ? AND ${ADDRESS_ACTIVE_SQL}`
				).bind(payload.address_id, payload.address).first("id");
				if (!row) {
					return c.text(msgs.InvalidAddressCredentialMsg, 401);
				}
			} catch (e) {
				const message = (e as Error).message || "";
				if (message.includes("expires_at") || message.includes("no such column")) {
					const row = await c.env.DB.prepare(
						`SELECT id FROM address WHERE id = ? AND name = ?`
					).bind(payload.address_id, payload.address).first("id");
					if (!row) {
						return c.text(msgs.InvalidAddressCredentialMsg, 401);
					}
				} else {
					throw e;
				}
			}
			await next();
		});
	} catch (e) {
		console.warn(e);
		const lang = c.get("lang") || c.env.DEFAULT_LANG;
		const msgs = i18n.getMessages(lang);
		return c.text(msgs.InvalidAddressCredentialMsg, 401)
	}
});
// admin auth
app.use('/admin/*', async (c, next) => {
	const lang = c.req.raw.headers.get("x-lang") || c.env.DEFAULT_LANG || "zh";
	const msgs = i18n.getMessages(lang);

	const apiTokenAuth = await tryAuthenticateApiToken(c, "admin");
	if (apiTokenAuth instanceof Response) return apiTokenAuth;
	if (apiTokenAuth === null) {
		const tokenAdmin = c.get("adminPayload");
		if (tokenAdmin?.role === "sub" && isForbiddenForSubAdmin(c.req.path, c.req.method)) {
			return c.text(msgs.ForbiddenForSubAdminMsg, 403);
		}
		await next();
		return;
	}

	const adminPayload = await authenticateAdmin(c);
	if (adminPayload) {
		c.set("adminPayload", adminPayload);
		if (adminPayload.role === "sub" && isForbiddenForSubAdmin(c.req.path, c.req.method)) {
			return c.text(msgs.ForbiddenForSubAdminMsg, 403);
		}
		await next();
		return;
	}

	if (getBooleanValue(c.env.DISABLE_ADMIN_PASSWORD_CHECK)) {
		c.set("adminPayload", {
			role: "main",
			username: getMainAdminUsername(c),
		});
		await next();
		return;
	}

	const authorization = c.req.raw.headers.get("Authorization");
	const adminAuth = c.req.raw.headers.get("x-admin-auth");
	if (!authorization?.trim() && !adminAuth?.trim()) {
		return c.text(msgs.MissingTokenMsg, 401)
	}

	return c.text(msgs.NeedAdminPasswordMsg, 401)
});


app.route('/', commonApi)
app.route('/', openAuthApi)
app.route('/', mailsApi)
app.route('/', adminApi)
app.route('/', apiSendMail)
app.route('/', telegramApi)

const health_check = async (c: Context<HonoCustomType>) => {
	const lang = c.req.raw.headers.get("x-lang") || c.env.DEFAULT_LANG;
	const msgs = i18n.getMessages(lang);
	if (!c.env.DB) {
		return c.text(msgs.DBNotAvailableMsg, 400);
	}
	if (!c.env.JWT_SECRET) {
		return c.text(msgs.JWTSecretNotSetMsg, 400);
	}
	if (getDomains(c).length === 0) {
		return c.text(msgs.DomainsNotSetMsg, 400);
	}
	return c.text("OK");
}

app.get('/', health_check)
app.get('/health_check', health_check)
app.all('/*', async c => c.text("Not Found", 404))


export default {
	fetch: async (request, env, ctx) => {
		return applyUtf8Charset(await app.fetch(request, env, ctx));
	},
	email: email,
	scheduled: scheduled,
}
