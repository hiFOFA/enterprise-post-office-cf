import { Context } from "hono";

import {
    actorFromAddressJwt,
    createApiToken,
    getTokenCatalog,
    listApiTokens,
    revokeApiToken,
} from "../api_token";
import i18n from "../i18n";

const requireActor = (c: Context<HonoCustomType>) => {
    const payload = c.get("jwtPayload");
    const msgs = i18n.getMessagesbyContext(c);
    if (!payload?.address_id) return c.text(msgs.InvalidAddressCredentialMsg, 401);
    return actorFromAddressJwt(payload);
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
