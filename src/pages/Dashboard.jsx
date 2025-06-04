import React, { useState, useEffect } from 'react';
import MapView from '../components/MapView.jsx';
import RiskIndicator from '../components/RiskIndicator.jsx';
import WeatherCard from '../components/WeatherCard.jsx';
import TrafficCard from '../components/TrafficCard.jsx';
import InsightsCard from '../components/InsightsCard.jsx';
import VoiceAlert from '../components/VoiceAlert.jsx';
import LocationInput from '../components/LocationInput.jsx';
import { getPrediction, checkHealth } from '../api';
import '../styles/Dashboard.css';

const Dashboard = ({ location, setLocation }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await checkHealth();
        setBackendStatus(health.status === 'healthy' ? 'healthy' : 'error');
      } catch (err) {
        setBackendStatus('error');
        console.error('Backend health check failed:', err);
      }
    };
    checkBackend();
  }, []);

  const handleUseCurrentLocation = () => {
    setLocationError(null);
    setLoading(true);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('Got current location:', newLocation);
        handleLocationChange(newLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(
          error.code === 1 ? 'Location access denied. Please allow location access in your browser settings.' :
          error.code === 2 ? 'Location unavailable. Please check your device location settings.' :
          error.code === 3 ? 'Location request timed out. Please try again.' :
          'Failed to get your location. Please try again.'
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleLocationChange = async (newLocation) => {
    if (!newLocation || typeof newLocation.lat !== 'number' || typeof newLocation.lng !== 'number') {
      setError('Invalid location coordinates');
      setLoading(false);
      return;
    }

    setLocation(newLocation);
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching prediction for location:', newLocation);
      const data = await getPrediction(newLocation.lat, newLocation.lng);
      console.log('Received prediction data:', data);
      
      if (!data || typeof data.prediction !== 'number') {
        throw new Error('Invalid prediction data received');
      }
      
      setPrediction(data);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err.message);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  if (!location) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Traffic Accident Risk Predictor</h1>
          <div className={`backend-status ${backendStatus}`}>
            Backend Status: {backendStatus}
          </div>
        </div>
        <div className="location-setup">
          <LocationInput 
            onSubmit={(lat, lng) => handleLocationChange({ lat, lng })}
            onUseCurrentLocation={handleUseCurrentLocation}
            currentLocation={location}
            error={locationError}
            isLoading={loading}
          />
          {locationError && (
            <div className="error-message">
              {locationError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Traffic Accident Risk Predictor</h1>
        <div className={`backend-status ${backendStatus}`}>
          Backend Status: {backendStatus}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="map-section">
          <MapView
            location={location}
            prediction={prediction}
            onLocationChange={handleLocationChange}
          />
          <div className="location-controls">
            <LocationInput 
              onSubmit={(lat, lng) => handleLocationChange({ lat, lng })}
              onUseCurrentLocation={handleUseCurrentLocation}
              currentLocation={location}
              error={locationError}
              isLoading={loading}
            />
            {locationError && (
              <div className="error-message">
                {locationError}
              </div>
            )}
          </div>
        </div>

        <div className="info-panel">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Analyzing location...</p>
            </div>
          ) : error ? (
            <div className="error">
              <h3>Error</h3>
              <p>{error}</p>
              <button onClick={() => handleLocationChange(location)}>
                Try Again
              </button>
            </div>
          ) : prediction ? (
            <>
              <RiskIndicator 
                prediction={prediction.prediction}
                insights={prediction.insights}
                voiceAlert={prediction.voice_alert}
              />
              
              {prediction.weather_data && (
                <WeatherCard data={prediction.weather_data} />
              )}

              {prediction.traffic_data && (
                <TrafficCard data={prediction.traffic_data} />
              )}

              {prediction.insights && prediction.insights.length > 0 && (
                <InsightsCard insights={prediction.insights} />
              )}

              {prediction.voice_alert && (
                <VoiceAlert voiceAlert={prediction.voice_alert} />
              )}
            </>
          ) : (
            <div className="no-data">
              <p>Click on the map to get accident risk prediction</p>
              <p className="hint">The prediction will show:</p>
              <ul>
                <li>Accident risk probability</li>
                <li>Current weather conditions</li>
                <li>Traffic information</li>
                <li>Safety insights</li>
                <li>Voice alerts</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 