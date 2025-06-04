import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icon in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map center updates
const MapUpdater = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
};

const MapView = ({ location, prediction, onLocationChange }) => {
  const [mapCenter, setMapCenter] = React.useState(
    location ? [location.lat, location.lng] : [12.9716, 77.5946]
  );

  React.useEffect(() => {
    if (location) {
      setMapCenter([location.lat, location.lng]);
    }
  }, [location]);

  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng;
    if (onLocationChange) {
      onLocationChange({ lat, lng });
    }
  };

  if (!mapCenter) {
    return <div className="map-loading">Loading map...</div>;
  }

  return (
    <div className="map-section">
      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          onClick={handleMapClick}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={mapCenter}>
            <Popup>
              {prediction ? (
                <div>
                  <strong>Accident Risk:</strong> {(prediction.prediction * 100).toFixed(1)}%
                  {prediction.weather_data && (
                    <div>
                      <strong>Weather:</strong> {JSON.stringify(prediction.weather_data)}
                    </div>
                  )}
                </div>
              ) : (
                'Click to get prediction'
              )}
            </Popup>
          </Marker>
          <MapUpdater center={mapCenter} />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView; 