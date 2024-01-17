import { RectBounds, VertBounds } from '@tsconline/shared'

const RADIUS = 6371 // radius of Earth in kilometers

export const calculateRectPosition = (lat: number, lon: number, bounds: RectBounds) => {
    const {upperLeftLat, upperLeftLon, lowerRightLat, lowerRightLon} = bounds

    const latRange = Math.abs(upperLeftLat - lowerRightLat);
    const lonRange = Math.abs(upperLeftLon - lowerRightLon);

    let normalizedLat = (lat - Math.min(upperLeftLat, lowerRightLat)) / latRange;
    let normalizedLon = (lon - Math.min(upperLeftLon, lowerRightLon)) / lonRange;

    let x = normalizedLon * 100;
    let y = normalizedLat * 100;
    y = 100 - y;

    return { x, y };
};

export const calculateRectButton = (childBounds: RectBounds, parentBounds: RectBounds) => {
    let upperLeft = calculateRectPosition(childBounds.upperLeftLat, childBounds.upperLeftLon, parentBounds);

    let midpoint = { 
      x: (Math.abs(childBounds.upperLeftLon) + Math.abs(childBounds.lowerRightLon)) / 2, 
      y: (Math.abs(childBounds.upperLeftLat) + Math.abs(childBounds.lowerRightLat)) / 2
    }
    let width = Math.max(childBounds.lowerRightLon, childBounds.upperLeftLon) - Math.min(childBounds.upperLeftLon, childBounds.lowerRightLon)
    let height = Math.max(childBounds.lowerRightLat, childBounds.upperLeftLat) - Math.min(childBounds.lowerRightLat, childBounds.upperLeftLat)
    
    return {midpoint, upperLeft, width, height}
}

export const calculateVertPosition = (lat: number, lon: number, frameHeight: number, frameWidth: number, bounds: VertBounds) => {
    lat = toRadians(lat)
    lon = toRadians(lon)
    let centerLat = toRadians(bounds.centerLat)
    let centerLon = toRadians(bounds.centerLon)
    const noOfKmPerPix = bounds.scale / (0.4 * frameWidth); // 10% of the frameWidth (pixels) = scale (Km).
    const noOfPixPerKm = (0.4 * frameWidth) / bounds.scale; // scale (Km) = 10% of the frameWidth (pixels).
    const lonOffset = lon - centerLon; // longitude offset from the center

    const P = (bounds.height / RADIUS) + 1; // Normalized distance above sphere

    // calculate the cosine of the angular distance between the two points
    const cosC = Math.cos(
        Math.sin(centerLat) * Math.sin(lat) +
        Math.sin(centerLat) * Math.cos(lat) * Math.cos(lonOffset)
    );

    // calculate the proportion of the viewable map that the point takes up
    const K = P !== cosC ? (P - 1) / (P - cosC) : 1;

    // calculate offsets in kilometers using the proportion K
    let x = K * (Math.cos(lat) * Math.sin(lonOffset)) * RADIUS; // offset from the center in kilometers.
    let y = K * (Math.cos(centerLat) * Math.sin(lat) - Math.sin(centerLat) * Math.cos(lat) * Math.cos(lonOffset)) * RADIUS;

    x = x * noOfPixPerKm;
    y = y * noOfPixPerKm;

    const normalizedX = ((frameWidth / 2 + x) / frameWidth) * 100;
    const normalizedY = ((frameHeight / 2 - y) / frameHeight) * 100;

    return { x: normalizedX, y: normalizedY };
}

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}