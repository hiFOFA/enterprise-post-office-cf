import { Context } from "hono";

import i18n from "../i18n";
import {
    getGlobalUiPrefs,
    normalizeHideAbout,
    saveGlobalUiPrefs,
} from "../global_ui_prefs";

const get = async (c: Context<HonoCustomType>): Promise<Response> => {
    return c.json(await getGlobalUiPrefs(c));
}

const save = async (c: Context<HonoCustomType>): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return c.text(msgs.InvalidInputMsg, 400);
    }
    const hideAbout = (body as Record<string, unknown>).hideAbout;
    if (!hideAbout || typeof hideAbout !== "object" || Array.isArray(hideAbout)) {
        return c.text(msgs.InvalidInputMsg, 400);
    }
    const src = hideAbout as Record<string, unknown>;
    if (
        typeof src.main !== "boolean"
        || typeof src.sub !== "boolean"
        || typeof src.user !== "boolean"
    ) {
        return c.text(msgs.InvalidInputMsg, 400);
    }
    await saveGlobalUiPrefs(c, { hideAbout: normalizeHideAbout(hideAbout) });
    return c.json({ success: true });
}

export default { get, save }
