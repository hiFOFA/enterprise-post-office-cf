import { createRouter, createWebHistory } from 'vue-router'
import Index from '../views/Index.vue'
import i18n from '../i18n'
import { useGlobalState } from '../store'
import {
    DEFAULT_LOCALE,
    getBrowserLocales,
    getPathWithLocale,
    getPreferredLocale,
    getStoredLocale,
    replaceLocaleInFullPath,
    resolveSupportedLocale,
    stripLocaleFromPath,
} from '../i18n/utils'

const {
    jwt, preferredLocale, adminAuth, isTelegram,
    isAdminAuthValid, openSettings, clearAdminSession,
} = useGlobalState()

const adminLoginRoute = (resolvedLocale) => ({
    path: getPathWithLocale('/login', resolvedLocale),
    query: { tab: 'admin' },
    replace: true,
})

const canEnterAdmin = () => (
    isAdminAuthValid.value
    || openSettings.value.disableAdminPasswordCheck
)

const discardInvalidAdminAuth = () => {
    if (adminAuth.value && !isAdminAuthValid.value) {
        clearAdminSession()
    }
}

const isTelegramBuild = (
    import.meta.env.VITE_IS_TELEGRAM === true
    || import.meta.env.VITE_IS_TELEGRAM === 'true'
)

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/:lang?/',
            component: Index
        },
        {
            path: '/:lang?/login',
            name: 'login',
            component: () => import('../views/common/EnterpriseLogin.vue')
        },
        {
            path: '/:lang?/user',
            component: () => import('../views/common/EnterpriseLogin.vue')
        },
        {
            path: '/:lang?/user/oauth2/callback',
            component: () => import('../views/common/EnterpriseLogin.vue')
        },
        {
            path: '/:lang?/admin',
            component: () => import('../views/Admin.vue')
        },
        {
            path: '/:lang?/telegram_mail',
            component: () => import('../views/telegram/Mail.vue')
        },
        {
            name: 'not-found',
            path: '/:pathMatch(.*)*',
            redirect: '/'
        }
    ]
});

router.beforeEach((to, from, next) => {
    const routeLocale = resolveSupportedLocale(to.path.split('/')[1])
    const resolvedLocale = routeLocale || getPreferredLocale(getStoredLocale(), getBrowserLocales())
    i18n.global.locale.value = resolvedLocale

    if (routeLocale) {
        preferredLocale.value = routeLocale
    } else if (!preferredLocale.value) {
        preferredLocale.value = getPreferredLocale('', getBrowserLocales())
    }

    if (Object.prototype.hasOwnProperty.call(to.query, 'jwt')) {
        const jwtQuery = Array.isArray(to.query.jwt) ? to.query.jwt[0] : to.query.jwt
        if (typeof jwtQuery === 'string') {
            jwt.value = jwtQuery
        }
        const query = { ...to.query }
        delete query.jwt
        next({
            path: to.path,
            query,
            hash: to.hash,
            replace: true,
        })
        return
    }

    if (routeLocale) {
        const canonicalRoutePath = replaceLocaleInFullPath(to.fullPath, routeLocale)
        if (canonicalRoutePath !== to.fullPath) {
            return next(canonicalRoutePath)
        }
    }

    if (routeLocale === DEFAULT_LOCALE) {
        return next(replaceLocaleInFullPath(to.fullPath, DEFAULT_LOCALE))
    }

    const pathWithoutLocale = stripLocaleFromPath(to.path)
    const tabQuery = Array.isArray(to.query.tab) ? to.query.tab[0] : to.query.tab

    discardInvalidAdminAuth()

    if (pathWithoutLocale === '/login') {
        if (tabQuery === 'admin') {
            if (isAdminAuthValid.value) {
                return next(getPathWithLocale('/admin', resolvedLocale))
            }
            return next()
        }
        if (isAdminAuthValid.value) {
            return next(getPathWithLocale('/admin', resolvedLocale))
        }
        if (jwt.value) {
            return next(getPathWithLocale('/', resolvedLocale))
        }
        return next()
    }

    if (pathWithoutLocale === '/admin') {
        if (!canEnterAdmin()) {
            return next(adminLoginRoute(resolvedLocale))
        }
        return next()
    }

    if (pathWithoutLocale === '/user' || pathWithoutLocale === '/user/oauth2/callback') {
        return next({
            path: getPathWithLocale('/login', resolvedLocale),
            query: to.query,
            hash: to.hash,
            replace: true,
        })
    }

    if (
        (pathWithoutLocale === '/' || pathWithoutLocale === '')
        && !jwt.value
        && !isTelegram.value
        && !isTelegramBuild
    ) {
        if (isAdminAuthValid.value) {
            return next(getPathWithLocale('/admin', resolvedLocale))
        }
        return next({
            path: getPathWithLocale('/login', resolvedLocale),
            query: to.query,
            hash: to.hash,
        })
    }

    next()
});

export default router
