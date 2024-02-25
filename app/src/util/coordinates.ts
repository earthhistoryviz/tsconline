import { RectBounds, VertBounds } from "@tsconline/shared";

const RADIUS = 6371; // radius of Earth in kilometers

/**
 * Calculates positioning given a rectangular bounds
 */
export const calculateRectBoundsPosition = (lat: number, lon: number, bounds: RectBounds) => {
  const { upperLeftLat, upperLeftLon, lowerRightLat, lowerRightLon } = bounds;

  const latRange = Math.abs(upperLeftLat - lowerRightLat);
  const lonRange = Math.abs(upperLeftLon - lowerRightLon);

  const normalizedLat = (lat - Math.min(upperLeftLat, lowerRightLat)) / latRange;
  const normalizedLon = (lon - Math.min(upperLeftLon, lowerRightLon)) / lonRange;

  const x = normalizedLon * 100;
  let y = normalizedLat * 100;
  y = 100 - y;

  return { x, y };
};

export const calculateRectButton = (childBounds: RectBounds, parentBounds: RectBounds) => {
  const upperLeft = calculateRectBoundsPosition(childBounds.upperLeftLat, childBounds.upperLeftLon, parentBounds);
  const lowerRight = calculateRectBoundsPosition(childBounds.lowerRightLat, childBounds.lowerRightLon, parentBounds);

  const midpoint = {
    // x: (Math.abs(childBounds.upperLeftLon) + Math.abs(childBounds.lowerRightLon)) / 2,
    x: (childBounds.lowerRightLon + childBounds.upperLeftLon) / 2,
    y: (childBounds.lowerRightLat + childBounds.upperLeftLat) / 2
    // y: (Math.abs(childBounds.upperLeftLat) + Math.abs(childBounds.lowerRightLat)) / 2
  };
  const width = lowerRight.x - upperLeft.x;
  const height = lowerRight.y - upperLeft.y;
  // let width = Math.abs(Math.max(childBounds.lowerRightLon, childBounds.upperLeftLon) - Math.min(childBounds.upperLeftLon, childBounds.lowerRightLon))
  // let height = Math.abs(Math.max(childBounds.lowerRightLat, childBounds.upperLeftLat) - Math.min(childBounds.lowerRightLat, childBounds.upperLeftLat))

  return { midpoint, upperLeft, width, height };
};

export const calculateVertBoundsPosition = (
  lat: number,
  lon: number,
  frameHeight: number,
  frameWidth: number,
  bounds: VertBounds
) => {
  lat = toRadians(lat);
  lon = toRadians(lon);
  const centerLat = toRadians(bounds.centerLat);
  const centerLon = toRadians(bounds.centerLon);
  const noOfPixPerKm = (0.4 * frameWidth) / bounds.scale; // scale (Km) = 10% of the frameWidth (pixels).
  const lonOffset = lon - centerLon; // longitude offset from the center

  const P = bounds.height / RADIUS + 1; // Normalized distance above sphere

  // calculate the cosine of the angular distance between the two points
  const cosC = Math.cos(
    Math.sin(centerLat) * Math.sin(lat) + Math.sin(centerLat) * Math.cos(lat) * Math.cos(lonOffset)
  );

  // calculate the proportion of the viewable map that the point takes up
  const K = P !== cosC ? (P - 1) / (P - cosC) : 1;

  // calculate offsets in kilometers using the proportion K
  let x = K * (Math.cos(lat) * Math.sin(lonOffset)) * RADIUS; // offset from the center in kilometers.
  let y =
    K * (Math.cos(centerLat) * Math.sin(lat) - Math.sin(centerLat) * Math.cos(lat) * Math.cos(lonOffset)) * RADIUS;

  x = x * noOfPixPerKm;
  y = y * noOfPixPerKm;

  const normalizedX = ((frameWidth / 2 + x) / frameWidth) * 100;
  const normalizedY = ((frameHeight / 2 - y) / frameHeight) * 100;

  return { x: normalizedX, y: normalizedY };
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
