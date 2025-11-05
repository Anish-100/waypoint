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
      <h1>Take a picture of your surroundings</h1>
      <div className="camera-box">   {/* This is a critical part where the camera window is created, the class can be edited in app.css*/}
        <video ref={videoRef} autoPlay playsInline />
      </div>
      {!stream ? (
        <button onClick={handleCamera}>Enable Camera</button>
      ) : (
        <button onClick={capturePhoto}>Capture Photo</button>
      )}
		<h2> Please ensure pictures are only in landscape mode!</h2>
	</div>
  );

}

export default App;