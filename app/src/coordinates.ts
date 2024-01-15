import { RectBounds } from '@tsconline/shared'

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