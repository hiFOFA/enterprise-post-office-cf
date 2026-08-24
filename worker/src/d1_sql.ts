export const flattenSql = (sql: string): string => {
    return sql.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
};

/** D1 `exec()` splits on newlines, so DDL must be a single line. */
export const d1Run = async (db: D1Database, sql: string): Promise<void> => {
    const flat = flattenSql(sql).replace(/;+$/, "");
    if (!flat) return;
    await db.exec(flat);
};
