import { Context } from "hono";

import {
    actorFromAddressJwt,
    chatAdvisor,
    clearAdvisorMessages,
    ensureAiAdvisorTables,
    getAdvisorAuth,
    listAdvisorMessages,
    saveUserAdvisorAuth,
} from "../ai_advisor";
import {
    getAdvisorModels,
    saveAdvisorProvider,
    testAdvisorProvider,
} from "../ai_advisor_config";
import i18n from "../i18n";

const requireUserActor = (c: Context<HonoCustomType>) => {
    const payload = c.get("jwtPayload");
    const msgs = i18n.getMessagesbyContext(c);
    if (!payload?.address || !payload?.address_id) {
        return c.text(msgs.InvalidAddressCredentialMsg, 401);
    }
    return actorFromAddressJwt(payload);
};

const getAuth = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    return getAdvisorAuth(c, actor);
};

const saveAuth = async (c: Context<HonoCustomType>) => {
    const payload = c.get("jwtPayload");
    const msgs = i18n.getMessagesbyContext(c);
    if (!payload?.address || !payload?.address_id) {
        return c.text(msgs.InvalidAddressCredentialMsg, 401);
    }
    return saveUserAdvisorAuth(c, actorFromAddressJwt(payload), payload);
};

const listMessages = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    return listAdvisorMessages(c, actor);
};

const clearMessages = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    return clearAdvisorMessages(c, actor);
};

const chat = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    return chatAdvisor(c, actor);
};

const listModels = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return getAdvisorModels(c, actor);
};

const saveProvider = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return saveAdvisorProvider(c, actor);
};

const testProvider = async (c: Context<HonoCustomType>) => {
    const actor = requireUserActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return testAdvisorProvider(c, actor);
};

export default {
    getAuth,
    saveAuth,
    listMessages,
    clearMessages,
    chat,
    listModels,
    saveProvider,
    testProvider,
};
