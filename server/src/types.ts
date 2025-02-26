import { throwError } from "@tsconline/shared";
import { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UserTable;
  verification: VerificationTable;
  ip: IpTable;
  workshop: WorkshopTable;
  usersWorkshops: UsersWorkshopsTable;
}

export type AccountType = "pro" | "default";

export interface UserTable {
  userId: Generated<number>;
  username: string;
  email: string;
  hashedPassword: string | null;
  uuid: string;
  pictureUrl: string | null;
  emailVerified: number;
  invalidateSession: number;
  isAdmin: number;
  accountType: AccountType;
}

export interface VerificationTable {
  userId: number;
  token: string;
  expiresAt: string;
  reason: "password" | "invalidate" | "verify";
}

export type OperationResult = {
  code: number;
  message: string;
};

export interface IpTable {
  id: Generated<number>;
  ip: string;
  count: number;
}

export interface WorkshopTable {
  workshopId: Generated<number>;
  title: string;
  start: string;
  end: string;
}

export interface UsersWorkshopsTable {
  workshopId: number;
  userId: number;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UpdatedUser = Updateable<UserTable>;

export type Verification = Selectable<VerificationTable>;
export type NewVerification = Insertable<VerificationTable>;

export type UsersWorkshops = Selectable<UsersWorkshopsTable>;
export type NewUsersWorkshops = Insertable<UsersWorkshopsTable>;

export type Ip = Selectable<IpTable>;
export type NewIp = Insertable<IpTable>;
export type UpdatedIp = Updateable<IpTable>;

export type Workshop = Selectable<WorkshopTable>;
export type NewWorkshop = Insertable<WorkshopTable>;
export type UpdatedWorkshop = Updateable<WorkshopTable>;

export type Email = {
  from: string;
  to: string;
  subject: string;
  preHeader: string;
  title: string;
  message: string;
  link?: string;
  buttonText?: string;
  action: string;
};

export type AssetConfig = {
  activeJar: string;
  decryptionJar: string;
  decryptionDirectory: string;
  datapacksDirectory: string;
  chartsDirectory: string;
  imagesDirectory: string;
  timescaleFilepath: string;
  patternsDirectory: string;
  colors: string;
  fileMetadata: string;
  publicDirectory: string;
  datapackImagesDirectory: string;
  privateDatapacksDirectory: string;
  uploadDirectory: string;
  publicDatapacksDirectory: string;
  translationFilepath: string;
  historyDirectory: string;
  historyStoreFilepath: string;
};

export type Colors = {
  [color: string]: string;
};

export type FileMetadataIndex = {
  [filepath: string]: FileMetadata;
};

export type FileMetadata = {
  fileName: string;
  lastUpdated: string;
  uuid: string;
};

export type Counter = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Maps a counter to the next counter, wrapping around to 0 after 9, essentially a modulo 10 operation but with types
const nextCounter: { [K in Counter]: Counter } = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 0,
};

export function incrementCounter(c: Counter): Counter {
  return nextCounter[c];
}

export type HistoryStore = {
  [uuid: string]: {
    counter: Counter; // counter for the user's history, wraps around 0-9
    entries: string[][]; // Counter indexes this array (0-9) and each index is an array of datapack paths
  };
};

export function assertHistoryStore(o: any): asserts o is HistoryStore {
  if (typeof o !== "object" || !o) throw "HistoryStore must be an object";
  for (const key in o) {
    const userHistory = o[key];
    if (typeof userHistory !== "object" || !userHistory) throw "HistoryStore must have a user history object";
    if (typeof userHistory.counter !== "number") throwError("HistoryStore", "counter", "number", userHistory.counter);
    if (userHistory.counter < 0 || userHistory.counter > 9) throw "HistoryStore counter must be between 0 and 9";
    if (!Array.isArray(userHistory.entries)) throw "HistoryStore entries must be an array";
    for (const entry of userHistory.entries) {
      if (!Array.isArray(entry)) throw "HistoryStore entry must be an array";
      for (const datapackPath of entry) {
        if (typeof datapackPath !== "string") throw "HistoryStore datapack path must be a string";
      }
    }
  }
}

export function assertEmail(o: any): asserts o is Email {
  if (typeof o !== "object" || !o) throw "Email must be an object";
  if (typeof o.from !== "string") throwError("Email", "from", "string", o.from);
  if (typeof o.to !== "string") throwError("Email", "to", "string", o.to);
  if (typeof o.subject !== "string") throwError("Email", "subject", "string", o.subject);
  if (typeof o.preHeader !== "string") throwError("Email", "preHeader", "string", o.preHeader);
  if (typeof o.title !== "string") throwError("Email", "title", "string", o.title);
  if (typeof o.message !== "string") throwError("Email", "message", "string", o.message);
  if (typeof o.action !== "string") throwError("Email", "action", "string", o.action);
  if (o.link && typeof o.link !== "string") throwError("Email", "link", "string", o.link);
  if (o.buttonText && typeof o.buttonText !== "string") throwError("Email", "buttonText", "string", o.buttonText);
}

export function assertFileMetadata(o: any): asserts o is FileMetadata {
  if (typeof o !== "object" || !o) throw "FileMetadata must be an object";
  if (typeof o.fileName !== "string") throwError("FileMetadata", "fileName", "string", o.fileName);
  if (typeof o.lastUpdated !== "string") throwError("FileMetadata", "lastUpdated", "string", o.lastUpdated);
  if (typeof o.uuid !== "string") throwError("FileMetadata", "uuid", "string", o.uuid);
}

export function assertFileMetadataIndex(o: any): asserts o is FileMetadataIndex {
  if (typeof o !== "object" || !o) throw "FileMetadataIndex must be an object";
  for (const key in o) {
    assertFileMetadata(o[key]);
  }
}

export function assertColors(o: any): asserts o is Colors {
  if (typeof o !== "object" || !o) throw "AssetConfig must be an object";
  for (const color in o) {
    if (typeof color !== "string") throw 'Colors must have a "color" key that is a string';
    if (typeof o[color] !== "string") throw "Colors must have a indexed value with type string";
  }
}

export function assertAssetConfig(o: any): asserts o is AssetConfig {
  if (typeof o !== "object" || !o) throw "AssetConfig must be an object";
  if (typeof o.activeJar !== "string") throw 'AssetConfig must have an "activeJar" string';
  if (typeof o.decryptionJar !== "string") throw 'AssetConfig must have a "decryptionJar" string';
  if (typeof o.decryptionDirectory !== "string") throw 'AssetConfig must have a "decryptionDirectory" string';
  if (typeof o.datapacksDirectory !== "string") throw 'AssetConfig must have a "datapackDirectory" string';
  if (typeof o.chartsDirectory !== "string") throw 'AssetConfig must have a "chartsDirectory" string';
  if (typeof o.imagesDirectory !== "string") throw 'AssetConfig must have a "imagesDirectory" string';
  if (typeof o.patternsDirectory !== "string") throw 'AssetConfig must have a "patternsDirectory" string';
  if (typeof o.colors !== "string") throw 'AssetConfig must have a "colors" string';
  if (typeof o.fileMetadata !== "string") throw 'AssetConfig must have a "fileMetadata" string';
  if (typeof o.uploadDirectory !== "string") throw 'AssetConfig must have a "uploadDirectory" string';
  if (typeof o.timescaleFilepath !== "string") throw 'AssetConfig must have a "timescaleFilepath" string';
  if (typeof o.datapackImagesDirectory !== "string") throw 'AssetConfig must have a "datapackImagesDirectory" string';
  if (typeof o.publicDirectory !== "string") throw 'AssetConfig must have a "publicDirectory" string';
  if (typeof o.privateDatapacksDirectory !== "string")
    throw 'AssetConfig must have a "privateDatapacksDirectory" string';
  if (typeof o.publicDatapacksDirectory !== "string") throw 'AssetConfig must have a "publicDatapacksDirectory" string';
  if (typeof o.translationFilepath !== "string") throw 'AssetConfig must have a "translationFilepath" string';
  if (typeof o.historyDirectory !== "string") throw 'AssetConfig must have a "historyDirectory" string';
  if (typeof o.historyStoreFilepath !== "string") throw 'AssetConfig must have a "historyStoreFilepath" string';
}

export function isAccountType(o: any): o is AccountType {
  return o === "pro" || o === "default";
}

export function isOperationResult(o: any): o is OperationResult {
  return typeof o.code === "number" && typeof o.message === "string";
}
export function assertOperationResult(o: any): asserts o is OperationResult {
  if (typeof o !== "object" || !o) throw "OperationResult must be an object";
  if (typeof o.code !== "number") throwError("OperationResult", "code", "number", o.code);
  if (typeof o.message !== "string") throwError("OperationResult", "message", "string", o.message);
}
