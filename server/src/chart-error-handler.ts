/*
This file is used to check if calls to java program have errors on graph generation
*/
// These lists of errors below are from the Java program print statements to console
export const knownFullErrors = new Set([
  "Settings is not valid to generate chart.",
  "Error! No columns selected",
  "Internal error while generating!",
  "Out of Memory!",
  "There was an error generating the image. Quitting."
]);
// These print statements occurs outside of the generate_chart method in the java program
// I had found these while doing initial testing, and they shouldn't even be possible because to reach this state for the normal user,
// you would need to replace the settings file with gibberish just before the java call, so this
// only occurs if something else went wrong with TSC Online, or if the user is trying to break the program purposely in someway
export const knownPartialErrors = new Set([
  "Premature end of file.",
  "Content is not allowed in prolog.",
  "[Fatal Error]",
  "java.util.zip.ZipException: error in opening zip file"
]);

// This function checks if the line contains any of the known errors
export function containsKnownError(line: string): boolean {
  // Check for full errors first to do an early return
  if (knownFullErrors.has(line)) {
    return true;
  }

  // Check for partial errors
  for (const error of knownPartialErrors) {
    if (line.includes(error)) {
      return true;
    }
  }

  return false;
}
