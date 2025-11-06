import { useState, useRef, useEffect } from 'react';
import './App.css';
import './ProfileStyles.css';

function App() {
  const [stream, setStream] = useState(null);
  const [currentPage, setCurrentPage] = useState('camera');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const videoRef = useRef();

  // Mock user data - replace with real data
  const [userData, setUserData] = useState({
    username: 'Explorer',
    joinDate: 'November 2024',
    totalPoints: 0,
    landmarksCollected: 0,
    photosUploaded: 0,
    level: 1,
    badges: []
  });

  // Request location permission on mount
  useEffect(() => {
    requestLocation();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle video stream assignment when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setIsCameraReady(false);
      
      // Wait for video to be ready and play
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

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setLocationError(null);
          console.log('Location acquired:', position.coords);
        },
        (error) => {
          console.log('Location error:', error);
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
      console.log('Media stream acquired');
    } catch (error) {
      console.log('Camera access denied:', error);
      alert('Camera access is required to capture landmarks. Please enable camera permissions in your browser settings.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !isCameraReady) {
      alert('Camera is not ready yet. Please wait a moment.');
      return;
    }
    
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
          console.log('Location unavailable at capture:', error);
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

  const processCapturedPhoto = (coords) => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      console.log('Photo captured:', imageUrl);
      console.log('Coordinates:', coords);
      
      if (coords) {
        alert(`Photo captured!\nLat: ${coords.latitude.toFixed(6)}\nLon: ${coords.longitude.toFixed(6)}\nAccuracy: ${coords.accuracy.toFixed(0)}m`);
      } else {
        alert('Photo captured! (No location data available)');
      }
      // TODO: Send to backend here
      // const formData = new FormData();
      // formData.append('image', blob);
      // formData.append('latitude', coords?.latitude);
      // formData.append('longitude', coords?.longitude);
      // formData.append('accuracy', coords?.accuracy);
      // 
      // fetch('/api/identify-landmark', { 
      //   method: 'POST', 
      //   body: formData 
      // })
      // .then(response => response.json())
      // .then(data => {
      //   console.log('Landmark identified:', data);
      //   // Add to collection, show card, etc.
      // });
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="app-title">Waypoint</h1>
        <p className="app-subtitle"> A different way to explore! </p>
      </header>

      {/* Navigation */}
      <nav className="nav">
        <button 
          className={`nav-button ${currentPage === 'camera' ? 'active' : ''}`}
          onClick={() => setCurrentPage('camera')}
        >
          <span className="nav-icon"> 📷 </span>
          <span className="nav-label">Discover</span>
        </button>
        
        <button 
          className={`nav-button ${currentPage === 'collection' ? 'active' : ''}`}
          onClick={() => setCurrentPage('collection')}
        >
          <span className="nav-icon">🎴</span>
          <span className="nav-label">Collection</span>
        </button>

        <button 
          className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentPage('profile')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Camera Page */}
        {currentPage === 'camera' && (
          <div className="page camera-page">
            <h2 className="page-title">Discover Landmarks</h2>
            <p className="page-description">
              Point your camera at a landmark to learn its history
            </p>

            <div className="location-status">
              {coordinates ? (
                <p className="location-success">
                  📍 Location: {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                  <span className="accuracy"> (±{coordinates.accuracy.toFixed(0)}m)</span>
                </p>
              ) : locationError ? (
                <p className="location-error">
                  ⚠️ Location unavailable: {locationError}
                  <button className="retry-btn" onClick={requestLocation}>Retry</button>
                </p>
              ) : (
                <p className="location-loading">📍 Getting location...</p>
              )}
            </div>
            
            <div className="camera-container">
              <div className="camera-box">
                {!stream ? (
                  <div className="camera-placeholder">
                    <span className="placeholder-icon">📸</span>
                    <p>Camera inactive</p>
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
            </div>

            <div className="button-container">
              {!stream ? (
                <button className="btn btn-primary" onClick={handleCamera}>
                  <span className="btn-icon">📷</span>
                  Enable Camera
                </button>
              ) : (
                <button 
                  className="btn btn-capture" 
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                >
                  <span className="capture-ring"></span>
                  {isCameraReady ? 'Capture' : 'Loading...'}
                </button>
              )}
            </div>

            {stream && isCameraReady && (
              <div className="camera-hint">
                <p>💡 Tip: Get close enough to clearly see the landmark</p>
                {coordinates && (
                  <p>✓ Location tracking active for better identification</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Collection Page */}
        {currentPage === 'collection' && (
          <div className="page collection-page">
            <h2 className="page-title">My Collection</h2>
            <p className="page-description">
              Your discovered landmarks will appear here
            </p>
            
            <div className="collection-grid">
              <div className="empty-state">
                <span className="empty-icon">🗺️</span>
                <h3>No Landmarks Yet</h3>
                <p>Start exploring to build your collection!</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setCurrentPage('camera')}
                >
                  Start Discovering
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Page */}
        {currentPage === 'profile' && (
          <div className="page profile-page">
            <div className="profile-header">
              <div className="profile-avatar">
                <span className="avatar-icon">👤</span>
              </div>
              <h2 className="profile-username">{userData.username}</h2>
              <p className="profile-join-date">Member since {userData.joinDate}</p>
            </div>

            <div className="profile-stats">
              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-value">{userData.totalPoints}</div>
                <div className="stat-label">Total Points</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏛️</div>
                <div className="stat-value">{userData.landmarksCollected}</div>
                <div className="stat-label">Landmarks</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📸</div>
                <div className="stat-value">{userData.photosUploaded}</div>
                <div className="stat-label">Photos</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🏆</div>
                <div className="stat-value">Level {userData.level}</div>
                <div className="stat-label">Explorer Level</div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title">🏅 Achievements TODO</h3>
              <div className="achievements-grid">
                {userData.badges.length > 0 ? (
                  userData.badges.map((badge, index) => (
                    <div key={index} className="achievement-badge">
                      <span className="badge-icon">{badge.icon}</span>
                      <span className="badge-name">{badge.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-achievements">
                    <p>🎯 No achievements yet</p>
                    <p className="achievement-hint">Keep exploring to earn badges!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-section">
              <h3 className="section-title">📊 Recent Activity TODO</h3>
              <div className="activity-list">
                <div className="empty-activity">
                  <p>📍 No recent activity</p>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage('camera')}
                  >
                    Start Exploring
                  </button>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <button className="btn btn-outline">Edit Profile TODO</button>
              <button className="btn btn-outline">Settings TODO</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
