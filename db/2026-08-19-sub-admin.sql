-- v0.0.8: sub-admin accounts, quota ledger, address owner + expiry
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

ALTER TABLE address ADD COLUMN owner_admin_id INTEGER;
ALTER TABLE address ADD COLUMN owner_admin_type TEXT;
ALTER TABLE address ADD COLUMN expires_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_address_owner_admin_id ON address(owner_admin_id);
CREATE INDEX IF NOT EXISTS idx_address_expires_at ON address(expires_at);
