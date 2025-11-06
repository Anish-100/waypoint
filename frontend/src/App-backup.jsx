import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);

  const handleCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (error) {
      // Silently ignore if permission denied
      console.log('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      console.log('Photo captured:', URL.createObjectURL(blob));
      // Send to backend here
    }, 'image/jpeg');
  };

  return ( // This prints it out
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>📍 Waypoint</h1>
        <div className="user-stats">
          {guestMode ? (
            <span className="guest-badge">Guest Mode</span>
          ) : (
            <>
              <span>⭐ {userStats.points}</span>
              <span>🎯 {userStats.collected}</span>
            </>
          )}
        </div>
      </header>

      {/* Location Detail Card */}
      {showLocationCard && selectedLocation && (
        <LocationCard
          location={selectedLocation}
          onClose={() => {
            setShowLocationCard(false)
            setSelectedLocation(null)
          }}
        />
      )}
    </div>
  )
}

export default App;