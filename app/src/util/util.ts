/**
 * Returns if the datapoint range (minDataAge, maxDataAge) is inside the user selected range of (userTopAge, userBaseAge)
 * @param minDataAge
 * @param maxDataAge
 * @param userTopAge
 * @param userBaseAge
 * @returns
 */
export function checkIfDataIsInRange(minDataAge: number, maxDataAge: number, userTopAge: number, userBaseAge: number) {
    if (userBaseAge == userTopAge) {
        return false
    }
    if ((minDataAge == 99999 && maxDataAge == -99999) || (minDataAge == 0 && maxDataAge == 0)) {
        return true
    }


    if (minDataAge <= userTopAge && maxDataAge >= userBaseAge) {
        return true
    }
    return ((minDataAge > userTopAge && minDataAge < userBaseAge) || (maxDataAge < userBaseAge && maxDataAge > userTopAge))
}