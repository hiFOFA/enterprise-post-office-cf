import { Context } from "hono";

import {
    actorFromAdmin,
    createApiToken,
    getTokenCatalog,
    listApiTokens,
    revokeApiToken,
} from "../api_token";
import i18n from "../i18n";

const requireActor = (c: Context<HonoCustomType>) => {
    const actor = actorFromAdmin(c);
    if (actor) return actor;
    const msgs = i18n.getMessagesbyContext(c);
    return c.text(msgs.NeedAdminPasswordMsg, 401);
};

const catalog = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return c.json(getTokenCatalog(actor));
};

const list = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return listApiTokens(c, actor);
};

const create = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return createApiToken(c, actor);
};

const revoke = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return revokeApiToken(c, actor);
};

export default { catalog, list, create, revoke };
