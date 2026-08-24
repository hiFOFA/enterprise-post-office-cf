import { Context } from "hono";
import { Jwt } from "hono/utils/jwt";
import { CONSTANTS } from "../constants";
import { getIntValue } from "../utils";
import { deleteAddressWithData } from "../common";
import { LocaleMessages } from "../i18n/type";

export const tgUserNewAddress = async (
    c: Context<HonoCustomType>, userId: string, address: string,
    msgs: LocaleMessages,
    enableRandomSubdomain: boolean = false
): Promise<{ address: string, jwt: string, password?: string | null }> => {
    throw Error(msgs.TgNewAddressDisabledMsg);
}

export const jwtListToAddressData = async (
    c: Context<HonoCustomType>, jwtList: string[],
    msgs: LocaleMessages
): Promise<{
    addressList: string[], addressIdMap: Record<string, number>,
    invalidJwtList: string[]
}> => {
    const addressList = [] as string[];
    const addressIdMap = {} as Record<string, number>;
    const invalidJwtList = [] as string[];
    for (const jwt of jwtList) {
        try {
            const { address, address_id } = await Jwt.verify(jwt, c.env.JWT_SECRET, "HS256");
            let name: string | null | undefined;
            try {
                name = await c.env.DB.prepare(
                    `SELECT name FROM address WHERE id = ? AND (expires_at IS NULL OR expires_at >= datetime('now'))`
                ).bind(address_id).first("name");
            } catch (e) {
                const message = (e as Error).message || "";
                if (message.includes("expires_at") || message.includes("no such column")) {
                    name = await c.env.DB.prepare(
                        `SELECT name FROM address WHERE id = ? `
                    ).bind(address_id).first("name");
                } else {
                    throw e;
                }
            }
            if (!name) {
                addressList.push(msgs.TgInvalidAddressMsg);
                invalidJwtList.push(jwt);
                continue;
            }
            addressList.push(address as string);
            addressIdMap[address as string] = address_id as number;
        } catch (e) {
            addressList.push(msgs.TgInvalidCredentialMsg);
            invalidJwtList.push(jwt);
            console.log(`Failed to get address list: ${(e as Error).message}`);
        }
    }
    return { addressList, addressIdMap, invalidJwtList };
}

export const bindTelegramAddress = async (
    c: Context<HonoCustomType>, userId: string, jwt: string,
    msgs: LocaleMessages
): Promise<string> => {
    const { address } = await Jwt.verify(jwt, c.env.JWT_SECRET, "HS256");
    if (!address) {
        throw Error(msgs.TgInvalidCredentialMsg);
    }
    const jwtList = await c.env.KV.get<string[]>(`${CONSTANTS.TG_KV_PREFIX}:${userId}`, 'json') || [];
    const { addressIdMap } = await jwtListToAddressData(c, jwtList, msgs);
    if (address as string in addressIdMap) {
        return address as string;
    }
    if (jwtList.length >= getIntValue(c.env.TG_MAX_ADDRESS, 5)) {
        throw Error(msgs.TgMaxAddressReachedCleanMsg);
    }
    await c.env.KV.put(`${CONSTANTS.TG_KV_PREFIX}:${userId}`, JSON.stringify([...jwtList, jwt]));
    // for mail push to telegram
    await c.env.KV.put(`${CONSTANTS.TG_KV_PREFIX}:${address}`, userId.toString());
    return address as string;
}

export const unbindTelegramAddress = async (
    c: Context<HonoCustomType>, userId: string, address: string
): Promise<boolean> => {
    const jwtList = await c.env.KV.get<string[]>(`${CONSTANTS.TG_KV_PREFIX}:${userId}`, 'json') || [];
    const newJwtList = [];
    for (const jwt of jwtList) {
        try {
            const { address: kvAddress } = await Jwt.verify(jwt, c.env.JWT_SECRET, "HS256");
            if (kvAddress == address) {
                continue;
            }
        } catch (e) {
            console.log(`解绑失败: ${(e as Error).message}`);
        }
        newJwtList.push(jwt);
    }
    await c.env.KV.put(`${CONSTANTS.TG_KV_PREFIX}:${userId}`, JSON.stringify(newJwtList));
    await c.env.KV.delete(`${CONSTANTS.TG_KV_PREFIX}:${address}`);
    return true;
}

export const unbindTelegramByAddress = async (
    c: Context<HonoCustomType>, address: string
): Promise<boolean> => {
    if (!c.env.KV) return true;
    const userId = await c.env.KV.get<string>(`${CONSTANTS.TG_KV_PREFIX}:${address}`)
    if (userId) {
        return await unbindTelegramAddress(c, userId, address);
    }
    return true;
}


export const deleteTelegramAddress = async (
    c: Context<HonoCustomType>, userId: string, address: string,
    msgs: LocaleMessages
): Promise<boolean> => {
    const jwtList = await c.env.KV.get<string[]>(`${CONSTANTS.TG_KV_PREFIX}:${userId}`, 'json') || [];
    const { addressIdMap } = await jwtListToAddressData(c, jwtList, msgs);
    if (!(address in addressIdMap)) {
        throw Error(msgs.TgAddressNotYoursMsg);
    }
    await deleteAddressWithData(c, null, addressIdMap[address])
    return true;
}
