/**
 * Returns if the datapoint range (minDataAge, maxDataAge) is inside the user selected range of (userTopAge, userBaseAge)
 * @param minDataAge 
 * @param maxDataAge 
 * @param userTopAge 
 * @param userBaseAge 
 * @returns 
 */
export function checkIfDataIsInRange(minDataAge: number, maxDataAge: number, userTopAge: number, userBaseAge: number) {
    return !((minDataAge > userTopAge && minDataAge < userBaseAge) || (maxDataAge < userBaseAge && maxDataAge > userTopAge))
}