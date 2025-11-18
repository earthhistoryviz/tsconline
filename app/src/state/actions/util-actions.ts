import { action } from "mobx";
import { ErrorCodes } from "../../util/error-codes";
import { pushError, pushSnackbar } from "./general-actions";
import { ColumnInfo, assertEventSettings, assertPointSettings, isServerResponseError } from "@tsconline/shared";
import { state } from "../state";
import { RenderColumnInfo } from "../../types";
/**
 * Since we hash by name only to allow consistency between facies maps and
 * the column page, a generic like Facies Label will cause errors.
 * The solution @Paolo came up with is to prepend the name of the parent
 * and change before the conversion to xml. The downside is we must check
 * every ColumnInfo object which may cause problems with time consistency.
 * However, this is asyncronous, which makes it less likely to cause problems.
 * @param column
 */
export const changeManuallyAddedColumns = action((column: ColumnInfo, columnHashMap: Map<string, RenderColumnInfo>) => {
  const parent = column.parent && columnHashMap.get(column.parent);
  if (parent && parent.columnDisplayType === "BlockSeriesMetaColumn") {
    if (column.name === `${column.parent} Facies Label`) {
      column.name = "Facies Label";
    } else if (column.name === `${column.parent} Series Label`) {
      column.name = "Series Label";
    } else if (column.name === `${column.parent} Members`) {
      column.name = "Members";
    } else if (column.name === `${column.parent} Facies`) {
      column.name = "Facies";
    } else if (column.name === `${column.parent} Chron`) {
      column.name = "Chron";
    } else if (column.name === `${column.parent} Chron Label`) {
      column.name = "Chron Label";
    }
  }
  if (column.columnDisplayType === "RootColumn" && column.name.substring(0, 14) === "Chart Title in") {
    column.name = column.name.substring(15, column.name.length);
  }
  for (const child of column.children) {
    changeManuallyAddedColumns(child, columnHashMap);
  }
});

export const normalizeColumnProperties = action((column: ColumnInfo) => {
  if (column.width !== undefined && (isNaN(column.width) || column.width < 20)) {
    column.width = 20;
    let name = column.name.substring(0, 17);
    if (name.length < column.name.length) name += "...";
    pushSnackbar("Invalid width input found, updating " + name + " width to 20", "warning");
  }
  for (const child of column.children) {
    normalizeColumnProperties(child);
  }
});

/**
 * Display error to dialog popup, same as pushError but with a message logged to console (Use this for server response errors)
 * @param error the error thrown
 * @param response the response from the server if applicable (nullable)
 * @param message the message to be shown
 */
export function displayServerError<T>(response: T | null, context: ErrorCodes, message: string) {
  if (!response) {
    pushError(context);
  } else if (isServerResponseError(response)) {
    console.log(`${message} with server response: ${response.error}`);
    pushError(context);
  } else {
    console.log(`${message} with server response: ${response}\n`);
    pushError(context);
  }
}

export function checkDatapackValidity(file: File) {
  if (file.name.length > 50) {
    pushError(ErrorCodes.DATAPACK_FILE_NAME_TOO_LONG);
    return false;
  }
  const ext = file.name.split(".").pop();
  // either an unencoded file (text file) or an encoded file that we have no type for
  if (file.type !== "text/plain" && file.type !== "") {
    pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_FILE);
    return false;
  }
  if (!ext || !/^(dpk|mdpk|txt|map)$/.test(ext)) {
    pushError(ErrorCodes.UNRECOGNIZED_DATAPACK_EXTENSION);
    return false;
  }
  return true;
}

export function checkIfDccDataIsInRange(
  dccColumn: RenderColumnInfo,
  userTopAge: number,
  userBaseAge: number,
  isNegativeUnits: boolean
) {
  if (isNegativeUnits) {
    userBaseAge = -userBaseAge;
    userTopAge = -userTopAge;
  }
  if (userBaseAge <= userTopAge) {
    return false;
  }
  let reachedFirstRef = false;
  while (!reachedFirstRef) {
    if (isNegativeUnits) {
      let temp: number = -dccColumn.maxAge;
      dccColumn.maxAge = -dccColumn.minAge;
      dccColumn.minAge = temp;
    }
    if (dccColumn.maxAge < userTopAge || dccColumn.minAge > userBaseAge) {
      if (!isNegativeUnits) {
        return false;
      }
    }
    if (dccColumn.columnDisplayType === "Event") {
      assertEventSettings(dccColumn.columnSpecificSettings);
    } else if (dccColumn.columnDisplayType === "Point") {
      assertPointSettings(dccColumn.columnSpecificSettings);
    } else {
      console.warn("WARNING: dccColumn is not a valid column type");
      return false;
    }
    //reached end of ref list
    if (!dccColumn.columnSpecificSettings.dualColCompColumnRef) {
      reachedFirstRef = true;
      break;
    }
    const refCol = state.settingsTabs.columnHashMap.get(dccColumn.columnSpecificSettings.dualColCompColumnRef);
    if (!refCol) {
      console.log("WARNING: tried to get reference while checking dcc column, but is undefined");
      return false;
    }
    dccColumn = refCol;
  }
  return true;
}
