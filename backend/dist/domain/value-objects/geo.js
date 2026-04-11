const DEGREES_TO_RADIANS_FACTOR = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
export function haversineDistanceKm(a, b) {
    const convertDegreesToRadians = (degrees) => degrees * DEGREES_TO_RADIANS_FACTOR;
    const latitudeDeltaRadians = convertDegreesToRadians(b.lat - a.lat);
    const longitudeDeltaRadians = convertDegreesToRadians(b.lng - a.lng);
    const sourceLatitudeRadians = convertDegreesToRadians(a.lat);
    const targetLatitudeRadians = convertDegreesToRadians(b.lat);
    const sineOfHalfLatitudeDelta = Math.sin(latitudeDeltaRadians / 2);
    const sineOfHalfLongitudeDelta = Math.sin(longitudeDeltaRadians / 2);
    const haversineValue = sineOfHalfLatitudeDelta * sineOfHalfLatitudeDelta +
        Math.cos(sourceLatitudeRadians) * Math.cos(targetLatitudeRadians) * (sineOfHalfLongitudeDelta * sineOfHalfLongitudeDelta);
    const centralAngleRadians = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));
    return EARTH_RADIUS_KM * centralAngleRadians;
}
