import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import './styles/main.css';

function App() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Set default location to Bangalore
          setLocation({ lat: 12.9716, lng: 77.5946 });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Set default location if geolocation is not supported
      setLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  return (
    <div className="app">
      <Dashboard location={location} setLocation={setLocation} />
    </div>
  );
}

export default App;