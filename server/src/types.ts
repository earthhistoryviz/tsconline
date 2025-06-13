import { CommentType, throwError } from "@tsconline/shared";
import { Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UserTable;
  verification: VerificationTable;
  ip: IpTable;
  workshop: WorkshopTable;
  usersWorkshops: UsersWorkshopsTable;
  comments: CommentsTable;
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
  regLink: string | null;
  regRestrict: number;
  creatorUUID: string;
  description: string | null;
}

export interface UsersWorkshopsTable {
  workshopId: number;
  userId: number;
}

export interface CommentsTable {
  id: Generated<number>;
  uuid: string;
  commentText: string;
  datapackTitle: string;
  dateCreated: string;
  flagged: number;
  username: string;
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

export type DatapackComment = Selectable<CommentsTable>;
export type NewDatapackComment = Insertable<CommentsTable>;
export type UpdatedDatapackComment = Updateable<CommentsTable>;

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

export type CommentsEmail = Omit<Email, "action" | "preHeader"> & {
  comments: CommentType[];
};

export type AssetConfig = {
  activeJar: string;
  decryptionJar: string;
  decryptionDirectory: string;
  datapacksDirectory: string;
  chartsDirectory: string;
  timescaleFilepath: string;
  patternsDirectory: string;
  colors: string;
  fileMetadata: string;
  publicDirectory: string;
  datapackImagesDirectory: string;
  privateDatapacksDirectory: string;
  uploadDirectory: string;
  publicDatapacksDirectory: string;
  translationsDirectory: string;
  modelConversionCacheDirectory: string;
  autoPlotCacheDirectory: string;
  helpDirectory: string;
  templateMarkdownDirectory: string;
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

export function assertCommentsEmail(o: any): asserts o is CommentsEmail {
  if (typeof o !== "object" || !o) throw "CommentsEmail must be an object";
  if (typeof o.from !== "string") throwError("CommentsEmail", "from", "string", o.from);
  if (typeof o.to !== "string") throwError("CommentsEmail", "to", "string", o.to);
  if (typeof o.subject !== "string") throwError("CommentsEmail", "subject", "string", o.subject);
  if (typeof o.title !== "string") throwError("CommentsEmail", "title", "string", o.title);
  if (typeof o.message !== "string") throwError("CommentsEmail", "message", "string", o.message);
  if (o.link && typeof o.link !== "string") throwError("CommentsEmail", "link", "string", o.link);
  if (o.buttonText && typeof o.buttonText !== "string")
    throwError("CommentsEmail", "buttonText", "string", o.buttonText);
  if (typeof o.comments !== "object" || !Array.isArray(o.comments))
    throwError("CommentsEmail", "comments", "array", o.comments);
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
  if (typeof o.translationsDirectory !== "string") throw 'AssetConfig must have a "translationsDirectory" string';
  if (typeof o.modelConversionCacheDirectory !== "string")
    throw 'AssetConfig must have a "modelConversionCacheDirectory" string';
  if (typeof o.autoPlotCacheDirectory !== "string") throw 'AssetConfig must have a "autoPlotCacheDirectory" string';
  if (typeof o.helpDirectory !== "string") throw 'AssetConfig must have a "helpDirectory" string';
  if (typeof o.templateMarkdownDirectory !== "string")
    throw 'AssetConfig must have a "templateMarkdownDirectory" string';
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

// need to check for profile picture too because of join with user table when fetching comments
export function assertDatapackCommentWithProfilePicture(
  o: any
): asserts o is DatapackComment & { pictureUrl?: string } {
  if (typeof o !== "object" || !o) throw "DatapackComment must be an object";
  if (typeof o.id !== "number") throwError("DatapackComment", "id", "number", o.id);
  if (typeof o.uuid !== "string") throwError("DatapackComment", "uuid", "string", o.uuid);
  if (typeof o.commentText !== "string") throwError("DatapackComment", "commentText", "string", o.commentText);
  if (typeof o.datapackTitle !== "string") throwError("DatapackComment", "datapackTitle", "string", o.datapackTitle);
  if (typeof o.dateCreated !== "string") throwError("DatapackComment", "dateCreated", "string", o.dateCreated);
  if (typeof o.flagged !== "number") throwError("DatapackComment", "flagged", "number", o.flagged);
  if (typeof o.username !== "string") throwError("DatapackComment", "username", "string", o.username);
  if (o.pictureUrl && typeof o.pictureUrl !== "string")
    throwError("DatapackComment", "pictureUrl", "string", o.pictureUrl);
}
