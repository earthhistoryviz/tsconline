export enum ErrorCodes {
  TOP_STAGE_AGE_INVALID = "TOP_STAGE_AGE_INVALID",
  BASE_STAGE_AGE_INVALID = "BASE_STAGE_AGE_INVALID",
  SERVER_RESPONSE_ERROR = "SERVER_RESPONSE_ERROR",
  INVALID_DATAPACK_INFO = "INVALID_DATAPACK_INFO",
  INVALID_PRESET_INFO = "INVALID_PRESET_INFO",
  INVALID_PATTERN_INFO = "INVALID_PATTERN_INFO",
  INVALID_TIME_SCALE = "INVALID_TIME_SCALE",
  INVALID_DATAPACK_CONFIG = "INVALID_DATAPACK_CONFIG",
  INVALID_SVG_READY_RESPONSE = "INVALID_SVG_READY_RESPONSE",
  INVALID_SETTINGS_RESPONSE = "INVALID_SETTINGS_RESPONSE",
  INVALID_CHART_RESPONSE = "INVALID_CHART_RESPONSE",
  INVALID_PATH = "INVALID_PATH",
  INVALID_DATAPACK_UPLOAD = "INVALID_DATAPACK_UPLOAD",
  INVALID_USER_DATAPACKS = "INVALID_USER_DATAPACKS",
  NO_DATAPACK_FILE_FOUND = "NO_DATAPACK_FILE_FOUND",
  DATAPACK_FILE_NAME_TOO_LONG = "DATAPACK_FILE_NAME_TOO_LONG",
  UNRECOGNIZED_DATAPACK_EXTENSION = "UNRECOGNIZED_DATAPACK_EXTENSION",
  UNRECOGNIZED_DATAPACK_FILE = "UNRECOGNIZED_DATAPACK_FILE",
  UNFINISHED_DATAPACK_UPLOAD_FORM = "UNFINISHED_DATAPACK_UPLOAD_FORM",
  DATAPACK_ALREADY_EXISTS = "DATAPACK_ALREADY_EXISTS"
}

export const ErrorMessages = {
  [ErrorCodes.TOP_STAGE_AGE_INVALID]: "Invalid top age/stage name input. Please enter a valid stage name/age.",
  [ErrorCodes.BASE_STAGE_AGE_INVALID]: "Invalid base age/stage name input. Please enter a valid stage name/age.",
  [ErrorCodes.SERVER_RESPONSE_ERROR]: "Server response error. Please try again later.",
  [ErrorCodes.INVALID_DATAPACK_INFO]: "Invalid datapack info received from server. Please try again later.",
  [ErrorCodes.INVALID_PRESET_INFO]: "Invalid preset info received from server. Please try again later.",
  [ErrorCodes.INVALID_PATTERN_INFO]: "Invalid pattern info received from server. Please try again later.",
  [ErrorCodes.INVALID_TIME_SCALE]: "Invalid time scale received from server. Please try again later.",
  [ErrorCodes.INVALID_DATAPACK_CONFIG]: "Datapacks were not properly set. Please try again later.",
  [ErrorCodes.INVALID_SVG_READY_RESPONSE]: "Invalid SVG ready response received from server. Please try again later.",
  [ErrorCodes.INVALID_SETTINGS_RESPONSE]: "Invalid settings response received from server. Please try again later.",
  [ErrorCodes.INVALID_CHART_RESPONSE]: "Invalid chart response received from server. Please try again later.",
  [ErrorCodes.INVALID_PATH]: "The requested path was invalid. Please ensure the path is correct.",
  [ErrorCodes.INVALID_DATAPACK_UPLOAD]: "Invalid datapack upload.",
  [ErrorCodes.INVALID_USER_DATAPACKS]: "Invalid user datapacks received from server. Please try again later.",
  [ErrorCodes.NO_DATAPACK_FILE_FOUND]: "No datapack file found. Please upload a datapack file first.",
  [ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG]: "Datapack file name is too long. Please shorten the file name.",
  [ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION]:
    "Unrecognized datapack extension. File must be of type .dpk, .mdpk, .map, .txt. Please upload a valid datapack file.",
  [ErrorCodes.UNRECOGNIZED_DATAPACK_FILE]: "Unrecognized datapack file. Please upload a valid datapack file.",
  [ErrorCodes.UNFINISHED_DATAPACK_UPLOAD_FORM]:
    "Please finish the datapack upload form before attempting to upload the file.",
  [ErrorCodes.DATAPACK_ALREADY_EXISTS]: "Datapack already exists. Please upload a new datapack file."
};
