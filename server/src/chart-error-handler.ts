/*
This file is used to check if calls to java program have errors on graph generation
*/
// These lists of errors below are from the Java program print statements to console
export const knownFullErrors = new Map([
  ["Settings is not valid to generate chart.", 1000],
  ["Error! No columns selected", 1001],
  ["Internal error while generating!", 1002],
  ["Out of Memory!", 1003],
  ["There was an error generating the image. Quitting.", 1004]
]);
// These print statements occurs outside of the generate_chart method in the java program
// I had found these while doing initial testing, and they shouldn't even be possible because to reach this state for the normal user,
// you would need to replace the settings file with gibberish just before the java call, so this
// only occurs if something else went wrong with TSC Online, or if the user is trying to break the program purposely in someway
export const knownPartialErrors = new Map([
  ["Premature end of file.", 2000],
  ["Content is not allowed in prolog.", 2001],
  ["[Fatal Error]", 2002],
  ["java.util.zip.ZipException: error in opening zip file", 2003]
]);

// This function checks if the line contains any of the known errors
export function containsKnownError(line: string): number {
  // Check for full errors first to do an early return
  if (knownFullErrors.has(line)) {
    return knownFullErrors.get(line)!;
  }

  // Check for partial errors
  for (const [error, code] of knownPartialErrors) {
    if (line.includes(error)) {
      return code;
    }
  }

  return 0;
}
