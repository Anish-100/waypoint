import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [stream, setStream] = useState(null);
  const [currentPage, setCurrentPage] = useState('camera');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const videoRef = useRef();

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
          // Don't show alert immediately, user can still use the app
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
      // Request camera with mobile-optimized settings
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      // Set stream state - useEffect will handle video element assignment
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
    
    // Get fresh location data at capture time
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
          processCapturedPhoto(coordinates); // Use last known coordinates
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
      
      // Show success feedback
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

            {/* Location Status */}
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
      </main>
    </div>
  );
}

export default App;