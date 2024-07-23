/*
This file is used to check if calls to java program has errors on graph generation
*/

// these lists of erros below are from the Java program print statements to console
export const knownErrors = new Set([
  "Settings is not valid to generate chart.",
  "Error! No columns selected",
  "Internal error while generating!",
  "Out of Memory!",
  "Premature end of file."
]);

// this function checks if the line contains any of the known errors
export function containsKnownError(line: string): boolean {
  for (const error of knownErrors) {
    if (line.includes(error)) {
      return true;
    }
  }
  return false;
}
