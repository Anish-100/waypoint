// Helper to convert degrees to radians
const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
}

/**
 * Calculates the distance between two latitude/longitude points
 * @returns {number} Distance in kilometers.
 */
export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1); 

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
}
    