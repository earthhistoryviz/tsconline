import BetterSqlite3 from "better-sqlite3";
import fs from "fs";

export interface UserRow {
  id: number;
  username: string | null;
  email: string;
  hashedPassword: string | null;
  googleId: string | null;
  uuid: string;
  pictureUrl: string | null;
}

if (!fs.existsSync("../server/db")) {
  fs.mkdirSync("../server/db");
}

let db: BetterSqlite3.Database | null = null;

export const getDb = (): BetterSqlite3.Database => {
  if (db) return db;
  db = new BetterSqlite3("../server/db/TSC.db");
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    hashed_password TEXT UNIQUE,
    google_id TEXT UNIQUE,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    picture_url TEXT
  );`);

  process.on("exit", () => db?.close());
  return db;
};
