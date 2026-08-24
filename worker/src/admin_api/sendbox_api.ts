import { Context } from 'hono'

import { handleListQuery } from '../common'
import { getAdminPayload, requireOwnedAddressByName } from '../admin_auth'

const list = async (c: Context<HonoCustomType>) => {
    const { address, limit, offset } = c.req.query();
    const admin = getAdminPayload(c);
    const ownerClause = admin?.role === 'sub' && admin.sub_admin_id
        ? `address IN (SELECT name FROM address WHERE owner_admin_id = ? AND owner_admin_type = 'sub')`
        : "";
    const ownerParams = admin?.role === 'sub' && admin.sub_admin_id
        ? [String(admin.sub_admin_id)]
        : [];
    if (address) {
        const denied = await requireOwnedAddressByName(c, address);
        if (denied) return denied;
        const where = ownerClause
            ? `where address = ? AND ${ownerClause}`
            : `where address = ?`;
        return await handleListQuery(c,
            `SELECT * FROM sendbox ${where} `,
            `SELECT count(*) as count FROM sendbox ${where} `,
            [address, ...ownerParams], limit, offset
        );
    }
    if (ownerClause) {
        return await handleListQuery(c,
            `SELECT * FROM sendbox where ${ownerClause} `,
            `SELECT count(*) as count FROM sendbox where ${ownerClause} `,
            ownerParams, limit, offset
        );
    }
    return await handleListQuery(c,
        `SELECT * FROM sendbox `,
        `SELECT count(*) as count FROM sendbox `,
        [], limit, offset
    );
};

const remove = async (c: Context<HonoCustomType>) => {
    const { id } = c.req.param();
    const row = await c.env.DB.prepare(
        `SELECT address FROM sendbox WHERE id = ?`
    ).bind(id).first<{ address?: string }>();
    if (row?.address) {
        const denied = await requireOwnedAddressByName(c, row.address);
        if (denied) return denied;
    }
    const { success } = await c.env.DB.prepare(
        `DELETE FROM sendbox WHERE id = ? `
    ).bind(id).run();
    return c.json({ success });
};

export default { list, remove };
