import { throwError } from "@tsconline/shared";
import { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UserTable;
  verification: VerificationTable;
  ip: IpTable;
}

export interface UserTable {
  userId: Generated<number>;
  username: string | null;
  email: string;
  hashedPassword: string | null;
  uuid: string;
  pictureUrl: string | null;
  emailVerified: number;
  invalidateSession: number;
}

export interface VerificationTable {
  userId: number;
  token: string;
  expiresAt: string;
  reason: "password" | "invalidate" | "verify";
}

export interface IpTable {
  id: Generated<number>;
  ip: string;
  count: number;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UpdatedUser = Updateable<UserTable>;

export type Verification = Selectable<VerificationTable>;
export type NewVerification = Insertable<VerificationTable>;

export type Ip = Selectable<IpTable>;
export type NewIp = Insertable<IpTable>;
export type UpdatedIp = Updateable<IpTable>;

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
  activeDatapacks: string[];
  decryptionJar: string;
  decryptionDirectory: string;
  datapacksDirectory: string;
  chartsDirectory: string;
  imagesDirectory: string;
  timescaleFilepath: string;
  patternsDirectory: string;
  colors: string;
  fileMetadata: string;
  uploadDirectory: string;
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
  decryptedFilepath: string;
  mapPackIndexFilepath: string;
  datapackIndexFilepath: string;
};

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
  if (typeof o.decryptedFilepath !== "string")
    throwError("FileMetadata", "decryptedFilepath", "string", o.decryptedFilepath);
  if (typeof o.mapPackIndexFilepath !== "string")
    throwError("FileMetadata", "mapPackIndexFilepath", "string", o.mapPackIndexFilepath);
  if (typeof o.datapackIndexFilepath !== "string")
    throwError("FileMetadata", "datapackIndexFilepath", "string", o.datapackIndexFilepath);
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
  if (!o.activeDatapacks || !Array.isArray(o.activeDatapacks)) throw 'AssetConfig must have an "activeJar" string';
  for (const [index, ad] of o.activeDatapacks.entries()) {
    if (typeof ad !== "string") throw "AssetConfig activeDatapacks item " + index + " must be a string";
  }
  if (typeof o.timescaleFilepath !== "string") throw 'AssetConfig must have a "timescaleFilepath" string';
}
