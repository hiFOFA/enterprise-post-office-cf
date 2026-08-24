import { Context } from "hono";

import {
    actorFromAddressJwt,
    addAddressGroupMembers,
    createAddressGroup,
    deleteAddressGroup,
    listAddressGroupMembers,
    listAddressGroups,
    listAddressNotes,
    removeAddressGroupMembers,
    renameAddressGroup,
    upsertAddressNote,
} from "../address_groups";
import i18n from "../i18n";

const requireActor = (c: Context<HonoCustomType>) => {
    const actor = actorFromAddressJwt(c.get("jwtPayload"));
    if (actor) return actor;
    return c.text(i18n.getMessagesbyContext(c).InvalidAddressCredentialMsg, 401);
};

const listGroups = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return listAddressGroups(c, actor);
};

const createGroup = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return createAddressGroup(c, actor);
};

const renameGroup = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return renameAddressGroup(c, actor);
};

const deleteGroup = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return deleteAddressGroup(c, actor);
};

const listMembers = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return listAddressGroupMembers(c, actor);
};

const addMembers = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return addAddressGroupMembers(c, actor);
};

const removeMembers = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return removeAddressGroupMembers(c, actor);
};

const saveNote = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    const id = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    return upsertAddressNote(c, actor, id, (body as { note?: unknown }).note);
};

const listNotes = async (c: Context<HonoCustomType>) => {
    const actor = requireActor(c);
    if (actor instanceof Response) return actor;
    return listAddressNotes(c, actor);
};

export default {
    listGroups,
    createGroup,
    renameGroup,
    deleteGroup,
    listMembers,
    addMembers,
    removeMembers,
    saveNote,
    listNotes,
};
