-- Rebuild sub_admins with AUTOINCREMENT so deleted ids are not reused.
-- Safe to skip if sqlite_master already shows AUTOINCREMENT on sub_admins.
DROP TABLE IF EXISTS sub_admins_autoincrement;
CREATE TABLE sub_admins_autoincrement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  quota_balance INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO sub_admins_autoincrement
  (id, username, password, enabled, quota_balance, created_at, updated_at)
SELECT id, username, password, enabled, quota_balance, created_at, updated_at
FROM sub_admins;
DROP TABLE sub_admins;
ALTER TABLE sub_admins_autoincrement RENAME TO sub_admins;
