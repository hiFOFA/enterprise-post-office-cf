export const DEFAULT_HIDE_ABOUT = {
    main: false,
    sub: true,
    user: true,
}

export const normalizeHideAbout = (input) => {
    const src = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {}
    return {
        main: typeof src.main === 'boolean' ? src.main : DEFAULT_HIDE_ABOUT.main,
        sub: typeof src.sub === 'boolean' ? src.sub : DEFAULT_HIDE_ABOUT.sub,
        user: typeof src.user === 'boolean' ? src.user : DEFAULT_HIDE_ABOUT.user,
    }
}
