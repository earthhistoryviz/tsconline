/**
 * Returns if the datapoint range (minDataAge, maxDataAge) is inside the user selected range of (userTopAge, userBaseAge)
 * @param minDataAge
 * @param maxDataAge
 * @param userTopAge
 * @param userBaseAge
 * @returns
 */
export function checkIfDataIsInRange(minDataAge: number, maxDataAge: number, userTopAge: number, userBaseAge: number) {
  return !(
    (minDataAge > userTopAge && minDataAge < userBaseAge) ||
    (maxDataAge < userBaseAge && maxDataAge > userTopAge)
  );
}

/**
 * Compare viewport height and px height
 * returns 1 if vh greater than px, -1 if less, 0 if equal
 * @param vh
 * @param px 
 * @returns 
 */
export function compareVhAndPx(vh: number | string, px: number | string): number {
    if (typeof vh === "string") {
        if (vh.length <= 2) throw Error(`vh param in wrong format ${vh}`)
        vh = Number(vh.slice(0, -2))
    }
    if (typeof px === "string") {
        if (px.length <= 2) throw Error(`px param in wrong format ${px}`)
        px = Number(px.slice(0, -2))
    }
    const viewportHeight = window.innerHeight;
    const vhToPx = viewportHeight * (vh / 100);

    if (vhToPx > px) {
        return 1;
    } else if (vhToPx < px) {
        return -1;
    } else {
        return 0;
    }
}