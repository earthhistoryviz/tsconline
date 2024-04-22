import BetterSqlite3 from "better-sqlite3";
import fs from "fs";

export interface UserRow {
  id: number;
  username: string | null;
  email: string;
  hashedPassword: string | null;
  uuid: string;
  pictureUrl: string | null;
  emailVerified: number;
}

export interface VerificationRow {
  userId: number;
  token: string;
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
    hashedPassword TEXT UNIQUE,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    pictureUrl TEXT,
    emailVerified INTEGER NOT NULL DEFAULT 0
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS verification (
    userId INT NOT NULL,
    token VARCHAR(32) NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id)
  );`);

  process.on("exit", () => db?.close());
  return db;
};
