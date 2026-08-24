import { Context } from "hono";
import { CONSTANTS } from "../constants";
import { d1Run } from "../d1_sql";
import utils from "../utils";

const DB_INIT_QUERIES = `
CREATE TABLE IF NOT EXISTS raw_mails (
    id INTEGER PRIMARY KEY,
    message_id TEXT,
    source TEXT,
    address TEXT,
    raw TEXT,
    raw_blob BLOB,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_mails_address ON raw_mails(address);

CREATE INDEX IF NOT EXISTS idx_raw_mails_created_at ON raw_mails(created_at);

CREATE INDEX IF NOT EXISTS idx_raw_mails_message_id ON raw_mails(message_id);

CREATE TABLE IF NOT EXISTS address (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    password TEXT,
    source_meta TEXT,
    owner_admin_id INTEGER,
    owner_admin_type TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_address_name ON address(name);

CREATE INDEX IF NOT EXISTS idx_address_created_at ON address(created_at);

CREATE INDEX IF NOT EXISTS idx_address_updated_at ON address(updated_at);

CREATE INDEX IF NOT EXISTS idx_address_source_meta ON address(source_meta);

CREATE INDEX IF NOT EXISTS idx_address_owner_admin_id ON address(owner_admin_id);

CREATE INDEX IF NOT EXISTS idx_address_expires_at ON address(expires_at);

CREATE TABLE IF NOT EXISTS auto_reply_mails (
    id INTEGER PRIMARY KEY,
    source_prefix TEXT,
    name TEXT,
    address TEXT UNIQUE,
    subject TEXT,
    message TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auto_reply_mails_address ON auto_reply_mails(address);

CREATE TABLE IF NOT EXISTS address_sender (
    id INTEGER PRIMARY KEY,
    address TEXT UNIQUE,
    balance INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_address_sender_address ON address_sender(address);

CREATE TABLE IF NOT EXISTS sendbox (
    id INTEGER PRIMARY KEY,
    address TEXT,
    raw TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sendbox_address ON sendbox(address);
CREATE INDEX IF NOT EXISTS idx_sendbox_created_at ON sendbox(created_at);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    user_email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    user_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_user_email ON users(user_email);

CREATE TABLE IF NOT EXISTS users_address (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    address_id INTEGER UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_address_user_id ON users_address(user_id);

CREATE INDEX IF NOT EXISTS idx_users_address_address_id ON users_address(address_id);

CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    role_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

CREATE TABLE IF NOT EXISTS user_passkeys (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    passkey_name TEXT NOT NULL,
    passkey_id TEXT NOT NULL,
    passkey TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON user_passkeys(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_passkeys_user_id_passkey_id ON user_passkeys(user_id, passkey_id);

CREATE TABLE IF NOT EXISTS sub_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    quota_balance INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_admin_quota_ledger (
    id INTEGER PRIMARY KEY,
    sub_admin_id INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT,
    address_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_admin_quota_ledger_sub_admin_id
    ON sub_admin_quota_ledger(sub_admin_id);

CREATE TABLE IF NOT EXISTS ai_advisor_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    address TEXT NOT NULL,
    address_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(actor_type, actor_id, address)
);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_auth_actor
    ON ai_advisor_auth(actor_type, actor_id);

CREATE TABLE IF NOT EXISTS ai_advisor_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_advisor_messages_actor
    ON ai_advisor_messages(actor_type, actor_id, id);

CREATE TABLE IF NOT EXISTS ai_advisor_providers (
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'cf',
    cf_model TEXT,
    base_url TEXT,
    model_id TEXT,
    api_key_enc TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_type, actor_id)
);

CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    scopes TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    revoked_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_actor ON api_tokens(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);

CREATE TABLE IF NOT EXISTS address_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_address_groups_actor ON address_groups(actor_type, actor_id);
CREATE TABLE IF NOT EXISTS address_group_members (group_id INTEGER NOT NULL, address_id INTEGER NOT NULL, PRIMARY KEY (group_id, address_id));
CREATE INDEX IF NOT EXISTS idx_address_group_members_address ON address_group_members(address_id);
CREATE TABLE IF NOT EXISTS address_notes (actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, address_id INTEGER NOT NULL, note TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (actor_type, actor_id, address_id));
CREATE INDEX IF NOT EXISTS idx_address_notes_address ON address_notes(address_id);
`

const ensureSubAdminsAutoincrement = async (c: Context<HonoCustomType>): Promise<void> => {
    const table = await c.env.DB.prepare(
        `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sub_admins'`
    ).first<{ sql: string }>();
    if (!table?.sql) {
        return;
    }
    if (/AUTOINCREMENT/i.test(table.sql)) {
        return;
    }
    await c.env.DB.exec(`DROP TABLE IF EXISTS sub_admins_autoincrement;`);
    await c.env.DB.exec(`
        CREATE TABLE sub_admins_autoincrement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            quota_balance INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await c.env.DB.exec(`
        INSERT INTO sub_admins_autoincrement
            (id, username, password, enabled, quota_balance, created_at, updated_at)
        SELECT id, username, password, enabled, quota_balance, created_at, updated_at
        FROM sub_admins;
    `);
    await c.env.DB.exec(`DROP TABLE sub_admins;`);
    await c.env.DB.exec(`ALTER TABLE sub_admins_autoincrement RENAME TO sub_admins;`);
}

export default {
    initialize: async (c: Context<HonoCustomType>) => {
        // remove all \r and \n characters from the query string
        // split by ; and join with a ;\n
        const query = DB_INIT_QUERIES.replace(/[\r\n]/g, "")
            .split(";")
            .map((query) => query.trim())
            .join(";\n");
        await c.env.DB.exec(query);

        const version = await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
        if (version) {
            return c.json({ message: "Database already initialized" });
        }
        await utils.saveSetting(c, CONSTANTS.DB_VERSION_KEY, CONSTANTS.DB_VERSION);
        return c.json({ message: "Database initialized" });
    },
    migrate: async (c: Context<HonoCustomType>) => {
        const version = await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
        if (version && version <= "v0.0.2") {
            // migration to v0.0.3: add password column
            const tableInfo = await c.env.DB.prepare(
                `PRAGMA table_info(address)`
            ).all();
            const hasPassword = tableInfo.results?.some(
                (col: any) => col.name === 'password'
            );
            if (!hasPassword) {
                await c.env.DB.exec(`ALTER TABLE address ADD COLUMN password TEXT;`);
            }
        }
        if (version && version <= "v0.0.3") {
            // migration to v0.0.4: add metadata column
            const tableInfo = await c.env.DB.prepare(
                `PRAGMA table_info(raw_mails)`
            ).all();
            const hasMetadata = tableInfo.results?.some(
                (col: any) => col.name === 'metadata'
            );
            if (!hasMetadata) {
                await c.env.DB.exec(`ALTER TABLE raw_mails ADD COLUMN metadata TEXT;`);
            }
        }
        if (version && version <= "v0.0.4") {
            // migration to v0.0.5: add source_meta column
            const tableInfo = await c.env.DB.prepare(
                `PRAGMA table_info(address)`
            ).all();
            const hasSourceMeta = tableInfo.results?.some(
                (col: any) => col.name === 'source_meta'
            );
            if (!hasSourceMeta) {
                await c.env.DB.exec(`ALTER TABLE address ADD COLUMN source_meta TEXT;`);
                await c.env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_address_source_meta ON address(source_meta);`);
            }
        }
        if (version && version <= "v0.0.5") {
            // migration to v0.0.6: add message_id index on raw_mails
            await c.env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_raw_mails_message_id ON raw_mails(message_id);`);
        }
        if (version && version <= "v0.0.6") {
            // migration to v0.0.7: add raw_blob column for gzip compressed email storage
            const tableInfo = await c.env.DB.prepare(
                `PRAGMA table_info(raw_mails)`
            ).all();
            const hasRawBlob = tableInfo.results?.some(
                (col: any) => col.name === 'raw_blob'
            );
            if (!hasRawBlob) {
                await c.env.DB.exec(`ALTER TABLE raw_mails ADD COLUMN raw_blob BLOB;`);
            }
        }
        if (version && version <= "v0.0.7") {
            await c.env.DB.exec(`
                CREATE TABLE IF NOT EXISTS sub_admins (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    enabled INTEGER DEFAULT 1,
                    quota_balance INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await c.env.DB.exec(`
                CREATE TABLE IF NOT EXISTS sub_admin_quota_ledger (
                    id INTEGER PRIMARY KEY,
                    sub_admin_id INTEGER NOT NULL,
                    delta INTEGER NOT NULL,
                    reason TEXT,
                    address_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await c.env.DB.exec(
                `CREATE INDEX IF NOT EXISTS idx_sub_admin_quota_ledger_sub_admin_id ON sub_admin_quota_ledger(sub_admin_id);`
            );
            const tableInfo = await c.env.DB.prepare(
                `PRAGMA table_info(address)`
            ).all();
            const addressColumns = new Set(
                (tableInfo.results || []).map((col: { name: string }) => col.name)
            );
            if (!addressColumns.has('owner_admin_id')) {
                await c.env.DB.exec(`ALTER TABLE address ADD COLUMN owner_admin_id INTEGER;`);
            }
            if (!addressColumns.has('owner_admin_type')) {
                await c.env.DB.exec(`ALTER TABLE address ADD COLUMN owner_admin_type TEXT;`);
            }
            if (!addressColumns.has('expires_at')) {
                await c.env.DB.exec(`ALTER TABLE address ADD COLUMN expires_at DATETIME;`);
            }
            await c.env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_address_owner_admin_id ON address(owner_admin_id);`);
            await c.env.DB.exec(`CREATE INDEX IF NOT EXISTS idx_address_expires_at ON address(expires_at);`);
        }
        if (version && version <= "v0.0.8") {
            await ensureSubAdminsAutoincrement(c);
        }
        if (version && version <= "v0.0.9") {
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS ai_advisor_auth (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_type TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                address TEXT NOT NULL,
                address_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(actor_type, actor_id, address)
            )`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_ai_advisor_auth_actor ON ai_advisor_auth(actor_type, actor_id)`);
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS ai_advisor_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_type TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_ai_advisor_messages_actor ON ai_advisor_messages(actor_type, actor_id, id)`);
        }
        if (version && version <= "v0.0.10") {
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS ai_advisor_providers (
                actor_type TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'cf',
                cf_model TEXT,
                base_url TEXT,
                model_id TEXT,
                api_key_enc TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (actor_type, actor_id)
            )`);
        }
        if (version && version <= "v0.0.11") {
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS api_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_type TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                name TEXT NOT NULL,
                token_hash TEXT NOT NULL UNIQUE,
                token_prefix TEXT NOT NULL,
                scopes TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used_at DATETIME,
                revoked_at DATETIME
            )`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_api_tokens_actor ON api_tokens(actor_type, actor_id)`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash)`);
        }
        if (version && version <= "v0.0.12") {
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS address_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_address_groups_actor ON address_groups(actor_type, actor_id)`);
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS address_group_members (group_id INTEGER NOT NULL, address_id INTEGER NOT NULL, PRIMARY KEY (group_id, address_id))`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_address_group_members_address ON address_group_members(address_id)`);
            await d1Run(c.env.DB, `CREATE TABLE IF NOT EXISTS address_notes (actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, address_id INTEGER NOT NULL, note TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (actor_type, actor_id, address_id))`);
            await d1Run(c.env.DB, `CREATE INDEX IF NOT EXISTS idx_address_notes_address ON address_notes(address_id)`);
        }
        if (version != CONSTANTS.DB_VERSION) {
            // remove all \r and \n characters from the query string
            // split by ; and join with a ;\n
            const query = DB_INIT_QUERIES.replace(/[\r\n]/g, "")
                .split(";")
                .map((query) => query.trim())
                .join(";\n");
            await c.env.DB.exec(query);
            // Update the version in the settings table
            await utils.saveSetting(c, CONSTANTS.DB_VERSION_KEY, CONSTANTS.DB_VERSION);
            return c.json({
                success: true,
                message: "Database migrated"
            });
        }
        return c.json({
            success: true,
            message: "Database does not need migration"
        });
    },
    getVersion: async (c: Context<HonoCustomType>) => {
        const version = await utils.getSetting(c, CONSTANTS.DB_VERSION_KEY);
        return c.json({
            need_initialization: !version,
            need_migration: version && version != CONSTANTS.DB_VERSION,
            current_db_version: version,
            code_db_version: CONSTANTS.DB_VERSION
        });
    },
}
