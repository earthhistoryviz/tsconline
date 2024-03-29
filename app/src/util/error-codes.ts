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
  INVALID_USER_DATAPACKS = "INVALID_USER_DATAPACKS"
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
  [ErrorCodes.INVALID_USER_DATAPACKS]: "Invalid user datapacks received from server. Please try again later."
};
