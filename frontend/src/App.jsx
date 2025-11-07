import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import './header.css';
import './nav_style.css';
import './camera_controls.css';

// Component to recenter map when coordinates change
function RecenterMap({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates) {
      map.setView([coordinates.latitude, coordinates.longitude], 13);
    }
  }, [coordinates, map]);
  return null;
}

// Detect backend URL
const getBackendUrl = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8000';
  }
  return 'https://waypoint-sk0h.onrender.com';
};
const Backend_URL = getBackendUrl();

const getBadges = (uniqueCount) => {
    const badges = [];
    if (uniqueCount >= 1) {
        badges.push({ name: "First Timer", 
                      icon: "🔰", description: "Captured your very first landmark.", 
                      className: "badge-tier-bronze", 
                      borderColor: "#CD7F32", 
                      iconColor: "#CD7F32",
                      backgroundColor: "rgba(205, 127, 50, 0.1)"
                    });
    }
    if (uniqueCount >= 5) {
        badges.push({ name: "Local Tourist", 
                      icon: "🧭", description: "Collected 5 unique landmarks.", 
                      className: "badge-tier-silver", 
                      borderColor: "#C0C0C0",
                      iconColor: "#C0C0C0",
                      backgroundColor: "rgba(192, 192, 192, 0.1)"
                    });
    }
    if (uniqueCount >= 10) {
        badges.push({ name: "Novice Collector", 
                      icon: "🌟", description: "Reached 10 unique landmarks.", 
                      className: "badge-tier-gold",
                      borderColor: "#FFD700",
                      iconColor: "#FFD700",
                      backgroundColor: "rgba(255, 215, 0, 0.1)"
                    });
    }
    if (uniqueCount >= 25) {
        badges.push({ name: "Urban Explorer", 
                      icon: "🗺️", 
                      description: "Collected 25 unique landmarks.", 
                      className: "badge-tier-platinum", 
                      borderColor: "#eeecc9",
                      iconColor: "#eeecc9",
                      backgroundColor: "rgba(238, 236, 201, 0.1)"
                    });
    }
    return badges;
};

function App() {
  const [stream, setStream] = useState(null);
  const [currentPage, setCurrentPage] = useState('camera');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [landmarkCollection, setLandmarkCollection] = useState([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  
  // Nearby landmark detection
  const [nearestLandmark, setNearestLandmark] = useState(null);
  const [isCheckingLandmarks, setIsCheckingLandmarks] = useState(false);
  const [captureResult, setCaptureResult] = useState(null);
  
  const videoRef = useRef();

  const [userData, setUserData] = useState({
    username: 'Explorer',
    joinDate: 'November 2025',
    totalPoints: 0,
    landmarksCollected: 0,
    photosUploaded: 0,
    level: 1,
    badges: []
  });

  // Fetch user's landmark collection
  const fetchLandmarkCollection = async () => {
    setIsLoadingCollection(true);
    try {
      const response = await fetch(`${Backend_URL}/api/v1/captures`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      const captures = data.captures || [];
      setLandmarkCollection(captures);
      
      // Calculate Unique Landmarks and Total Photos
      const uniqueLandmarkIds = new Set();
      captures.forEach(capture => {
        if (capture.landmark_id) {
          uniqueLandmarkIds.add(capture.landmark_id);
        }
      });

      const uniqueCount = uniqueLandmarkIds.size;
      const totalPhotos = captures.length;
      
      // Level increases by 1 for every 10 unique landmarks. Level 1 is base.
      const newLevel = 1 + Math.floor(uniqueCount / 10);
      
      // Calculate Badges 
      const newBadges = getBadges(uniqueCount);

      // Update user stats
      setUserData(prev => ({
        ...prev,
        landmarksCollected: uniqueCount,
        photosUploaded: totalPhotos,
        totalPoints: uniqueCount * 100 + totalPhotos * 10, // Simple point calculation
        level: newLevel,
        badges: newBadges
      }));
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setIsLoadingCollection(false);
    }
  };

  // Check for nearby landmarks
  const checkNearbyLandmarks = async (coords) => {
    if (!coords) return;
    
    setIsCheckingLandmarks(true);
    try {
      const formData = new FormData();
      formData.append('latitude', coords.latitude);
      formData.append('longitude', coords.longitude);

      const response = await fetch(`${Backend_URL}/api/v1/landmarks/nearby`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setNearestLandmark(data.landmark);
      } else {
        setNearestLandmark(null);
      }
    } catch (error) {
      console.error('Error checking nearby landmarks:', error);
      setNearestLandmark(null);
    } finally {
      setIsCheckingLandmarks(false);
    }
  };

  // Load collection when viewing collection page
  useEffect(() => {
    if (currentPage === 'collection' || currentPage === 'profile') {
      fetchLandmarkCollection();
    }
  }, [currentPage]);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsCameraReady(false);
      
      videoRef.current.onloadedmetadata = async () => {
        try {
          await videoRef.current.play();
          setIsCameraReady(true);
          console.log('Camera ready');
        } catch (playError) {
          console.error('Play error:', playError);
        }
      };
    }
  }, [stream]);

  // Check nearby landmarks when coordinates change
  useEffect(() => {
    if (coordinates && currentPage === 'camera') {
      checkNearbyLandmarks(coordinates);
    }
  }, [coordinates, currentPage]);

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCoordinates(newCoords);
          setLocationError(null);
        },
        (error) => {
          setLocationError(error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation not supported');
    }
  };

  const handleCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
    } catch (error) {
      alert('Camera access is required to capture landmarks. Please enable camera permissions in your browser settings.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !isCameraReady) {
      alert('Camera is not ready yet. Please wait a moment.');
      return;
    }
    
    if (!nearestLandmark) {
      setCaptureResult({
        success: false,
        message: 'No landmarks within range. Get closer to a landmark to capture it!'
      })
      return;
    }

    // Clear previous result
    setCaptureResult(null);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCoordinates(currentCoords);
          processCapturedPhoto(currentCoords);
        },
        (error) => {
          processCapturedPhoto(coordinates);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000
        }
      );
    } else {
      processCapturedPhoto(coordinates);
    }
  };

  const processCapturedPhoto = async (coords) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append('image', blob, 'photo.jpg');
        formData.append('latitude', coords.latitude);
        formData.append('longitude', coords.longitude);
        formData.append('timestamp', new Date().toISOString());
        
        const response = await fetch(`${Backend_URL}/api/v1/landmarks/identify`, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Show the landmark details
          setCaptureResult({
            success: true,
            landmark: data.landmark,
            message: data.message
          });
          
          fetchLandmarkCollection(); // Re-fetch collection to update stats after a successful capture

          // Refresh the nearby landmarks check
          checkNearbyLandmarks(coords);
        } else {
          // Failed - show error message
          setCaptureResult({
            success: false,
            message: data.detail || 'Failed to capture landmark'
          });
        }
        
      } catch (error) {
        setCaptureResult({
          success: false,
          message: 'Upload failed: ' + error.message
        });
      }
    }, 'image/jpeg', 0.9);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // The one that prints everything
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header-title">Waypoint</h1>
        <p className="header-subtitle"> Explore  Learn  Collect ! </p>
      </header>

      {/* Navigation */}
      <nav className="nav-container">
        {[
          { id: 'camera', icon: '📷', label: 'Discover' },
          { id: 'collection', icon: '🎴', label: 'Collection' },
          { id: 'profile', icon: '👤', label: 'Profile' }
        ].map(nav => (
          <button
            key={nav.id}
            onClick={() => setCurrentPage(nav.id)}
            className={`nav-item ${currentPage === nav.id ? 'active' : ''}`}
          >
            <span className="nav-icon">{nav.icon}</span>
            <span className="nav-label">{nav.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Camera Page */}
        {currentPage === 'camera' && (
          <section className="camera-page">
            <h2 className="page-title">Discover Landmarks</h2>
            <p className="page-subtitle">
              Point your camera at a landmark to learn its history and snap a picture to add it to your collection!
            </p>

            {/* Location Status */}
            <div className="location-status">
              {coordinates ? (
                <span className="location-chip success">
                  Your current coordinates are: 📍 {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)} (±{coordinates.accuracy.toFixed(0)}m)
                </span>
              ) : locationError ? (
                <span 
                  className="location-chip error"
                  onClick={requestLocation}
                >
                  ⚠️ {locationError}
                </span>
              ) : (
                <span className="location-chip loading">📍 Getting location...</span>
              )}
            </div>

            {/* Nearby Landmark Alert */}
            {isCheckingLandmarks ? (
              <div className="alert alert-info">
                🔍 Checking for nearby landmarks...
              </div>
            ) : nearestLandmark ? (
              <div className="alert alert-success">
                <p className="alert-title">🎯 {nearestLandmark.name}</p>
                <p className="alert-description">{nearestLandmark.description}</p>
                <p className="alert-meta">📍 {nearestLandmark.distance}m away</p>
              </div>
            ) : coordinates ? (
              <div className="alert alert-warning">
                No landmarks nearby. Move closer to a landmark to capture it!
              </div>
            ) : null}

            {/* Capture Result */}
            {captureResult && (
              <div className={`alert ${captureResult.success ? 'alert-success' : 'alert-error'}`}>
                <span 
                  className="alert-close"
                  onClick={() => setCaptureResult(null)}
                >
                  ×
                </span>
                {captureResult.success ? (
                  <div>
                    <h3 className="alert-title">🎉 {captureResult.landmark.name}</h3>
                    <p className="alert-description">{captureResult.landmark.description}</p>
                    {captureResult.landmark.historical_context && (
                      <div className="alert-historical">
                        📜 {captureResult.landmark.historical_context}
                      </div>
                    )}
                    <p className="alert-meta">
                      Distance: {captureResult.landmark.distance}m
                    </p>
                  </div>
                ) : (
                  <p>{captureResult.message}</p>
                )}
              </div>
            )}
            
            {/* Map */}
            {coordinates && (
              <div className="map-container">
                <MapContainer
                  center={[coordinates.latitude, coordinates.longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[coordinates.latitude, coordinates.longitude]}>
                    <Popup>You are here!</Popup>
                  </Marker>
                  <RecenterMap coordinates={coordinates} />
                </MapContainer>
              </div>
            )}

            {/* Camera View */}
            <div className="camera-view">
              {!stream ? (
                <div className="camera-placeholder">
                  <span className="camera-placeholder-icon">📸</span>
                  <p className="camera-placeholder-text">Camera inactive</p>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="camera-video"
                />
              )}
            </div>

            {/* Camera Controls */}
            <div className="camera-controls">
              {!stream ? (
                <button
                  onClick={handleCamera}
                  className="btn-camera-enable"
                >
                  📷 Enable Camera
                </button>
              ) : (
                <button
                  onClick={capturePhoto}
                  className={`btn-capture ${!isCameraReady ? 'loading' : !nearestLandmark ? 'no-landmark' : ''}`}
                  disabled={!isCameraReady || !nearestLandmark}
                >
                  {!isCameraReady ? 'Loading...' : !nearestLandmark ? 'No Landmarks Nearby' : '📸 Capture Landmark'}
                </button>
              )}
            </div>
          </section>
        )}

        {/* Collection Page */}
        {currentPage === 'collection' && (
          <section>
            <h2 className="page-title">My Collection</h2>
            <p className="page-subtitle">Your discovered landmarks</p>

            {isLoadingCollection ? (
              <div className="loading-container">
                <div className="loading-spinner">Loading...</div>
              </div>
            ) : landmarkCollection.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🗺️</span>
                <h3 className="empty-state-title">No Landmarks Yet</h3>
                <p className="empty-state-description">
                  Start exploring to build your collection!
                </p>
                <button
                  onClick={() => setCurrentPage('camera')}
                  className="btn btn-primary"
                >
                  Start Discovering
                </button>
              </div>
            ) : (
              <div className="collection-grid">
                {landmarkCollection.map((capture) => (
                  <article key={capture.id} className="collection-card">
                    <img
                      src={capture.image_url}
                      alt="Landmark capture"
                      className="collection-card-image"
                    />
                    <div className="collection-card-content">
                      <h3 className="collection-card-title">
                        {capture.landmarks?.name || `Landmark #${capture.id}`}
                      </h3>
                      
                      {capture.landmarks?.description && (
                        <p className="collection-card-description">
                          {capture.landmarks.description}
                        </p>
                      )}
                      {capture.landmarks?.historical_context && (
                        <p className="collection-card-historical-context">
                          {capture.landmarks.historical_context}
                        </p>

                      )}
                      <div className="collection-card-meta">
                        <span>📍</span>
                        <span>
                          {capture.latitude?.toFixed(4)}, {capture.longitude?.toFixed(4)}
                        </span>
                      </div>

                      {capture.distance_from_landmark_meters && (
                        <p className="collection-card-meta">
                          📏 Captured from {capture.distance_from_landmark_meters}m away
                        </p>
                      )}

                      <div className="collection-card-meta">
                        <span>📅</span>
                        <span>{formatDate(capture.timestamp || capture.created_at)}</span>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <span className="chip chip-info">
                          {capture.landmarks?.category || "Captured"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Profile Page */}
        {currentPage === 'profile' && (
          <section>
            <div className="profile-header">
              <div className="profile-avatar">
                <span>👤</span>
              </div>
              <h2 className="profile-username">{userData.username}</h2>
              <p className="profile-member-since">
                Member since {userData.joinDate}
              </p>
            </div>

            <div className="stats-grid">
              {[
                { icon: '⭐', value: userData.totalPoints, label: 'Total Points' },
                { icon: '🏛️', value: userData.landmarksCollected, label: 'Landmarks' },
                { icon: '📸', value: userData.photosUploaded, label: 'Photos' },
                { icon: '🏆', value: `Level ${userData.level}`, label: 'Explorer Level' }
              ].map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <span className="stat-icon">{stat.icon}</span>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              ))}
            </div>

            <h3 className="section-title">🏅 Achievements</h3>
            {userData.badges.length > 0 ? (
                <div className="achievements-grid">
                    {userData.badges.map((badge, index) => (
                        <div key={index} className={`badge-card ${badge.className}`} style={{ 
                                borderColor: badge.borderColor,
                                background: badge.backgroundColor,
                                borderStyle: 'solid',
                                borderWidth: '2px'
                            }}>
                            <span className="badge-icon"style={{ color: badge.iconColor }}>{badge.icon}</span>
                            <h4 className="badge-name">{badge.name}</h4>
                            <p className="badge-description">{badge.description}</p>
                        </div>
                    ))}
                </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <p>🎯 No achievements yet</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Keep exploring to earn badges!
                </p>
              </div>
            )}

            <h3 className="section-title" style={{marginTop: '1.5rem'}}>📊 Recent Activity</h3>
            <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '1rem' }}>📍 No recent activity</p>
              <button
                onClick={() => setCurrentPage('camera')}
                className="btn btn-primary"
              >
                Start Exploring
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;