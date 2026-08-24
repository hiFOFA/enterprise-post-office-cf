import { Context } from "hono";

import {
    actorFromAdmin,
    chatAdvisor,
    clearAdvisorMessages,
    ensureAiAdvisorTables,
    getAdvisorAuth,
    listAdvisorMailboxes,
    listAdvisorMessages,
    saveAdvisorAuth,
} from "../ai_advisor";
import {
    getAdvisorModels,
    getAdvisorPolicy,
    saveAdvisorPolicy,
    saveAdvisorProvider,
    testAdvisorProvider,
} from "../ai_advisor_config";
import i18n from "../i18n";

const requireAdminActor = (c: Context<HonoCustomType>) => {
    const actor = actorFromAdmin(c);
    if (actor) return actor;
    const msgs = i18n.getMessagesbyContext(c);
    return c.text(msgs.NeedAdminPasswordMsg, 401);
};

const listMailboxes = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return listAdvisorMailboxes(c, actor);
};

const getAuth = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return getAdvisorAuth(c, actor);
};

const saveAuth = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return saveAdvisorAuth(c, actor);
};

const listMessages = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return listAdvisorMessages(c, actor);
};

const clearMessages = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return clearAdvisorMessages(c, actor);
};

const chat = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    return chatAdvisor(c, actor);
};

const listModels = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return getAdvisorModels(c, actor);
};

const saveProvider = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return saveAdvisorProvider(c, actor);
};

const testProvider = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return testAdvisorProvider(c, actor);
};

const getPolicy = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return getAdvisorPolicy(c);
};

const savePolicy = async (c: Context<HonoCustomType>) => {
    const actor = requireAdminActor(c);
    if (actor instanceof Response) return actor;
    await ensureAiAdvisorTables(c.env.DB);
    return saveAdvisorPolicy(c);
};

export default {
    listMailboxes,
    getAuth,
    saveAuth,
    listMessages,
    clearMessages,
    chat,
    listModels,
    saveProvider,
    testProvider,
    getPolicy,
    savePolicy,
};
