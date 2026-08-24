import { Context } from "hono";
import { handleMailListQuery } from "../common";
import { resolveRawEmailRow } from "../gzip";
import { getAdminPayload, requireOwnedAddressByName } from "../admin_auth";
import i18n from "../i18n";

const ownedMailSql = (c: Context<HonoCustomType>): { clause: string, params: string[] } => {
    const admin = getAdminPayload(c);
    if (!admin || admin.role !== "sub" || !admin.sub_admin_id) {
        return { clause: "", params: [] };
    }
    return {
        clause: `address IN (SELECT name FROM address WHERE owner_admin_id = ? AND owner_admin_type = 'sub')`,
        params: [String(admin.sub_admin_id)],
    };
}

const combineWhere = (parts: string[]): string => {
    const filtered = parts.filter((item) => item);
    return filtered.length > 0 ? `where ${filtered.join(" and ")}` : "";
}

export default {
    getMails: async (c: Context<HonoCustomType>) => {
        const { address, limit, offset } = c.req.query();
        if (address) {
            const denied = await requireOwnedAddressByName(c, address);
            if (denied) return denied;
        }
        const owner = ownedMailSql(c);
        const addressQuery = address ? `address = ?` : "";
        const addressParams = address ? [address] : [];
        const where = combineWhere([addressQuery, owner.clause]);
        const filterParams = [...addressParams, ...owner.params];
        return await handleMailListQuery(c,
            `SELECT * FROM raw_mails ${where}`,
            `SELECT count(*) as count FROM raw_mails ${where}`,
            filterParams, limit, offset
        );
    },
    getUnknowMails: async (c: Context<HonoCustomType>) => {
        const { limit, offset } = c.req.query();
        return await handleMailListQuery(c,
            `SELECT * FROM raw_mails where address NOT IN (select name from address) `,
            `SELECT count(*) as count FROM raw_mails`
            + ` where address NOT IN (select name from address) `,
            [], limit, offset
        );
    },
    getMail: async (c: Context<HonoCustomType>) => {
        const { id } = c.req.param();
        const result = await c.env.DB.prepare(
            `SELECT * FROM raw_mails WHERE id = ?`
        ).bind(id).first<{ address?: string }>();
        if (!result) return c.json(null);
        if (result.address) {
            const denied = await requireOwnedAddressByName(c, result.address);
            if (denied) return denied;
        }
        return c.json(await resolveRawEmailRow(result));
    },
    deleteMail: async (c: Context<HonoCustomType>) => {
        const msgs = i18n.getMessagesbyContext(c);
        const { id } = c.req.param();
        const result = await c.env.DB.prepare(
            `SELECT address FROM raw_mails WHERE id = ?`
        ).bind(id).first<{ address?: string }>();
        if (result?.address) {
            const denied = await requireOwnedAddressByName(c, result.address);
            if (denied) return denied;
        }
        const { success } = await c.env.DB.prepare(
            `DELETE FROM raw_mails WHERE id = ? `
        ).bind(id).run();
        if (!success) {
            return c.text(msgs.OperationFailedMsg, 500);
        }
        return c.json({
            success: success
        })
    }
}