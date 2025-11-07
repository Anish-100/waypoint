import { useState, useRef, useEffect } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

{/*
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
*/}

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

function App() {
  const [stream, setStream] = useState(null);
  const [currentPage, setCurrentPage] = useState('camera');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [landmarkCollection, setLandmarkCollection] = useState([]);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const videoRef = useRef();

  const [userData, setUserData] = useState({
    username: 'Explorer',
    joinDate: 'November 2024',
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
      const response = await fetch(`${Backend_URL}/api/v1/landmarks/collection`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setLandmarkCollection(data.landmarks || []);
      
      // Update user stats
      setUserData(prev => ({
        ...prev,
        landmarksCollected: data.landmarks?.length || 0,
        photosUploaded: data.landmarks?.length || 0
      }));
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setIsLoadingCollection(false);
    }
  };

  // Load collection when viewing collection page
  useEffect(() => {
    if (currentPage === 'collection') {
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
        
        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }
        
        const data = await response.json();
        alert(`✅ Landmark captured!\n\n📍 ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        
      } catch (error) {
        alert('❌ Upload failed: ' + error.message);
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: '#2196f3', 
        color: 'white', 
        p: 3, 
        textAlign: 'center',
        boxShadow: 2
      }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
          Waypoint
        </Typography>
        <Typography variant="subtitle1">
          A different way to explore!
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        bgcolor: 'white',
        boxShadow: 1,
        borderBottom: '1px solid #e0e0e0'
      }}>
        {[
          { id: 'camera', icon: '📷', label: 'Discover' },
          { id: 'collection', icon: '🎴', label: 'Collection' },
          { id: 'profile', icon: '👤', label: 'Profile' }
        ].map(nav => (
          <Box
            key={nav.id}
            onClick={() => setCurrentPage(nav.id)}
            sx={{
              flex: 1,
              py: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: currentPage === nav.id ? '#e3f2fd' : 'transparent',
              borderBottom: currentPage === nav.id ? '3px solid #2196f3' : 'none',
              transition: 'all 0.3s',
              '&:hover': { bgcolor: '#f5f5f5' }
            }}
          >
            <Typography sx={{ fontSize: '24px' }}>{nav.icon}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {nav.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Camera Page */}
        {currentPage === 'camera' && (
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              Discover Landmarks
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Point your camera at a landmark to learn its history
            </Typography>

            <Box sx={{ mb: 3 }}>
              {coordinates ? (
                <Chip 
                  icon={<LocationOnIcon />}
                  label={`${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)} (±${coordinates.accuracy.toFixed(0)}m)`}
                  color="success"
                  sx={{ mb: 2 }}
                />
              ) : locationError ? (
                <Chip 
                  label={`⚠️ ${locationError}`}
                  color="error"
                  onClick={requestLocation}
                />
              ) : (
                <Chip label="📍 Getting location..." />
              )}
            </Box>
            
            {/* edits here */}
            {coordinates && (
              <Box sx={{ 
                height: 300, 
                mb: 3, 
                borderRadius: 2, 
                overflow: 'hidden',
                boxShadow: 2 
              }}>
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
                </MapContainer>
              </Box>
            )}
              

            <Box sx={{ 
              bgcolor: 'black', 
              borderRadius: 2, 
              overflow: 'hidden',
              mb: 3,
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {!stream ? (
                <Box sx={{ textAlign: 'center', color: 'white' }}>
                  <Typography variant="h1">📸</Typography>
                  <Typography>Camera inactive</Typography>
                </Box>
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              {!stream ? (
                <Box
                  onClick={handleCamera}
                  sx={{
                    bgcolor: '#2196f3',
                    color: 'white',
                    py: 2,
                    px: 4,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'inline-block',
                    '&:hover': { bgcolor: '#1976d2' }
                  }}
                >
                  <Typography variant="h6">📷 Enable Camera</Typography>
                </Box>
              ) : (
                <Box
                  onClick={capturePhoto}
                  sx={{
                    bgcolor: isCameraReady ? '#4caf50' : '#ccc',
                    color: 'white',
                    py: 2,
                    px: 4,
                    borderRadius: '50px',
                    cursor: isCameraReady ? 'pointer' : 'not-allowed',
                    display: 'inline-block',
                    '&:hover': isCameraReady ? { bgcolor: '#45a049' } : {}
                  }}
                >
                  <Typography variant="h6">
                    {isCameraReady ? 'Capture' : 'Loading...'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Collection Page with Material UI Cards */}
        {currentPage === 'collection' && (
          <Box>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
              My Collection
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your discovered landmarks
            </Typography>

            {isLoadingCollection ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : landmarkCollection.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h1" sx={{ mb: 2 }}>🗺️</Typography>
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                  No Landmarks Yet
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Start exploring to build your collection!
                </Typography>
                <Box
                  onClick={() => setCurrentPage('camera')}
                  sx={{
                    bgcolor: '#2196f3',
                    color: 'white',
                    py: 2,
                    px: 4,
                    borderRadius: 2,
                    cursor: 'pointer',
                    display: 'inline-block',
                    '&:hover': { bgcolor: '#1976d2' }
                  }}
                >
                  Start Discovering
                </Box>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 3
              }}>
                {landmarkCollection.map((landmark) => (
                  <Card 
                    key={landmark.id}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={landmark.image_url}
                      alt="Landmark"
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        Landmark #{landmark.id}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 18, mr: 1, color: '#2196f3' }} />
                        <Typography variant="body2" color="text.secondary">
                          {landmark.latitude?.toFixed(4)}, {landmark.longitude?.toFixed(4)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarTodayIcon sx={{ fontSize: 16, mr: 1, color: '#757575' }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(landmark.timestamp)}
                        </Typography>
                      </Box>

                      {landmark.created_at && (
                        <Box sx={{ mt: 2 }}>
                          <Chip 
                            label="Captured"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Profile Page */}
        {currentPage === 'profile' && (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ 
                width: 100, 
                height: 100, 
                bgcolor: '#2196f3', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2
              }}>
                <Typography variant="h2">👤</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                {userData.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Member since {userData.joinDate}
              </Typography>
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 2,
              mb: 4
            }}>
              {[
                { icon: '⭐', value: userData.totalPoints, label: 'Total Points' },
                { icon: '🏛️', value: userData.landmarksCollected, label: 'Landmarks' },
                { icon: '📸', value: userData.photosUploaded, label: 'Photos' },
                { icon: '🏆', value: `Level ${userData.level}`, label: 'Explorer Level' }
              ].map((stat, idx) => (
                <Card key={idx} sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3">{stat.icon}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, my: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                </Card>
              ))}
            </Box>

            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              🏅 Achievements
            </Typography>
            <Card sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                🎯 No achievements yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Keep exploring to earn badges!
              </Typography>
            </Card>

            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              📊 Recent Activity
            </Typography>
            <Card sx={{ p: 3, textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                📍 No recent activity
              </Typography>
              <Box
                onClick={() => setCurrentPage('camera')}
                sx={{
                  bgcolor: '#2196f3',
                  color: 'white',
                  py: 1.5,
                  px: 3,
                  borderRadius: 2,
                  cursor: 'pointer',
                  display: 'inline-block',
                  '&:hover': { bgcolor: '#1976d2' }
                }}
              >
                Start Exploring
              </Box>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;