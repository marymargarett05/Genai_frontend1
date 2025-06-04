import React from 'react';
import './WeatherCard.css';

const WeatherCard = ({ data }) => {
  if (!data) return null;

  // Helper function to format values
  const formatValue = (value, unit = '') => {
    if (value === undefined || value === null) return 'N/A';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="weather-card">
      <h3>Weather Conditions</h3>
      <div className="weather-details">
        <div className="metric">
          <div className="metric-label">Temperature</div>
          <div className="metric-value">
            {formatValue(data.temperature, '°C')}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Conditions</div>
          <div className="metric-value">
            {data.conditions || 'N/A'}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Humidity</div>
          <div className="metric-value">
            {formatValue(data.humidity, '%')}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Wind Speed</div>
          <div className="metric-value">
            {formatValue(data.wind_speed, 'm/s')}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Visibility</div>
          <div className="metric-value">
            {formatValue(data.visibility, 'km')}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Precipitation</div>
          <div className="metric-value">
            {formatValue(data.precipitation, 'mm')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard; 