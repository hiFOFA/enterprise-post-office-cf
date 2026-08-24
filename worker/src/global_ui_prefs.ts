import { Context } from "hono";

import { CONSTANTS } from "./constants";
import { getJsonSetting, saveSetting } from "./utils";

export type HideAboutPrefs = {
    main: boolean
    sub: boolean
    user: boolean
}

export type GlobalUiPrefs = {
    hideAbout: HideAboutPrefs
}

export const DEFAULT_HIDE_ABOUT: HideAboutPrefs = {
    main: false,
    sub: true,
    user: true,
}

export const normalizeHideAbout = (input: unknown): HideAboutPrefs => {
    const src = (input && typeof input === "object" && !Array.isArray(input))
        ? input as Record<string, unknown>
        : {};
    return {
        main: typeof src.main === "boolean" ? src.main : DEFAULT_HIDE_ABOUT.main,
        sub: typeof src.sub === "boolean" ? src.sub : DEFAULT_HIDE_ABOUT.sub,
        user: typeof src.user === "boolean" ? src.user : DEFAULT_HIDE_ABOUT.user,
    };
}

export const getGlobalUiPrefs = async (
    c: Context<HonoCustomType>
): Promise<GlobalUiPrefs> => {
    const stored = await getJsonSetting<Partial<GlobalUiPrefs>>(
        c, CONSTANTS.GLOBAL_UI_PREFS_KEY
    );
    return {
        hideAbout: normalizeHideAbout(stored?.hideAbout),
    };
}

export const saveGlobalUiPrefs = async (
    c: Context<HonoCustomType>,
    prefs: GlobalUiPrefs
): Promise<void> => {
    await saveSetting(
        c,
        CONSTANTS.GLOBAL_UI_PREFS_KEY,
        JSON.stringify({
            hideAbout: normalizeHideAbout(prefs.hideAbout),
        })
    );
}
