import React, { useState, useEffect } from 'react';
import './LocationInput.css';

const LocationInput = ({ onSubmit, onUseCurrentLocation, currentLocation, error, isLoading }) => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update input fields when currentLocation changes
  useEffect(() => {
    if (currentLocation) {
      setLatitude(currentLocation.lat.toString());
      setLongitude(currentLocation.lng.toString());
    }
  }, [currentLocation]);

  // Search cities when searchTerm changes
  useEffect(() => {
    const searchCities = async () => {
      if (searchTerm.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error searching cities:', error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchCities, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleCitySelect = (city) => {
    const lat = parseFloat(city.lat);
    const lng = parseFloat(city.lon);
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    setSearchTerm(city.display_name.split(',')[0]);
    setSuggestions([]);
    onSubmit(lat, lng);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return;
    }
    
    onSubmit(lat, lng);
  };

  return (
    <div className="location-input">
      <form onSubmit={handleSubmit}>
        <div className="input-row">
          <div className="input-group">
            <div className="input-field">
              <label htmlFor="latitude">Latitude:</label>
              <input
                type="number"
                id="latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="Enter latitude"
                step="any"
                required
              />
            </div>
            <div className="input-field">
              <label htmlFor="longitude">Longitude:</label>
              <input
                type="number"
                id="longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="Enter longitude"
                step="any"
                required
              />
            </div>
          </div>

          <div className="city-search-field">
            <label htmlFor="city-search">Or search for a city:</label>
            <input
              type="text"
              id="city-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter city name..."
              className="city-search-input"
            />
            {isSearching && <div className="search-loading">Searching...</div>}
            {suggestions.length > 0 && (
              <ul className="city-suggestions">
                {suggestions.map((city) => (
                  <li
                    key={city.place_id}
                    onClick={() => handleCitySelect(city)}
                    className="city-suggestion-item"
                  >
                    {city.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="button-group">
          <button type="submit" className="submit-button" disabled={isLoading}>
            {isLoading ? 'Getting Prediction...' : 'Get Risk Assessment'}
          </button>
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="location-button"
            disabled={isLoading}
          >
            Use My Location
          </button>
        </div>
      </form>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default LocationInput; 