import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { getDistanceKm } from '../utils/locationUtils'; // Import the proximity check

// Set the check-in radius (e.g., 50 meters, converted to kilometers)
const PROXIMITY_THRESHOLD_KM = 0.05; 

export const useLocation = (landmarks) => {
    const [userLocation, setUserLocation] = useState(null);
    const [nearbyLandmark, setNearbyLandmark] = useState(null);
    const [locationError, setLocationError] = useState(null);

    useEffect(() => {
        let locationWatcher = null;
        
        const startLocationTracking = async () => {
            // Request Permission
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Permission to access location was denied. Cannot play game.');
                return;
            }

            // Start Watching Location
            locationWatcher = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000, // Update location every 5 seconds
                    distanceInterval: 10, // Update only if user moves 10 meters
                },
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newLocation = { latitude, longitude };
                    setUserLocation(newLocation);
                    
                    // Check Proximity Immediately (See section 3 below)
                    checkProximity(newLocation, landmarks);
                }
            );
        };

        startLocationTracking();

        // Cleanup function runs when the component unmounts
        return () => {
            if (locationWatcher) {
                locationWatcher.remove();
            }
        };
    }, [landmarks]); // Re-run effect if the landmarks list changes

    // Function to check if the user is near any uncollected landmark
    const checkProximity = (currentLocation, landmarkList) => {
        if (!currentLocation || !landmarkList) return;

        let closestLandmark = null;
        for (const landmark of landmarkList) {
            const distance = getDistanceKm(
                currentLocation.latitude,
                currentLocation.longitude,
                landmark.latitude,
                landmark.longitude
            );

            if (distance <= PROXIMITY_THRESHOLD_KM) {
                closestLandmark = landmark; 
                break;
            }
        }
        setNearbyLandmark(closestLandmark);
    };

    return { userLocation, nearbyLandmark, locationError };
};