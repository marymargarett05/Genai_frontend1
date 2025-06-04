import React from 'react';
import './TrafficCard.css';

const TrafficCard = ({ data }) => {
  const getCongestionLevel = (percentage) => {
    if (percentage >= 70) return "Heavy";
    if (percentage >= 40) return "Moderate";
    return "Light";
  };

  const getSpeedLevel = (speed) => {
    if (speed < 20) return "Very Slow";
    if (speed < 40) return "Slow";
    if (speed < 60) return "Moderate";
    return "Fast";
  };

  const getSpeedColor = (speed) => {
    if (speed < 20) return '#ff4444';
    if (speed < 40) return '#ffbb33';
    if (speed < 60) return '#00C851';
    return '#007bff';
  };

  const getCongestionColor = (percentage) => {
    if (percentage >= 70) return '#ff4444';
    if (percentage >= 40) return '#ffbb33';
    return '#00C851';
  };

  return (
    <div className="traffic-card">
      <h3>🚦 Traffic Conditions</h3>
      <div className="traffic-metrics">
        <div className="metric">
          <div className="metric-label">Current Speed</div>
          <div className="metric-value" style={{ color: getSpeedColor(data.flow_speed) }}>
            {data.flow_speed} km/h
          </div>
          <div className="metric-status" style={{ color: getSpeedColor(data.flow_speed) }}>
            {getSpeedLevel(data.flow_speed)}
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Congestion</div>
          <div className="metric-value" style={{ color: getCongestionColor(data.congestion_percentage) }}>
            {data.congestion_percentage}%
          </div>
          <div className="metric-status" style={{ color: getCongestionColor(data.congestion_percentage) }}>
            {getCongestionLevel(data.congestion_percentage)} Congestion
          </div>
        </div>

        <div className="metric">
          <div className="metric-label">Free Flow Speed</div>
          <div className="metric-value">
            {data.free_flow_speed} km/h
          </div>
          <div className="metric-status">
            Expected Speed
          </div>
        </div>
      </div>

      <div className="speed-comparison">
        <div 
          className="current-speed-bar" 
          style={{ 
            width: `${Math.min(100, (data.flow_speed / data.free_flow_speed) * 100)}%`,
            backgroundColor: getSpeedColor(data.flow_speed)
          }}
        ></div>
      </div>
      <div className="speed-labels">
        <span>Current Speed</span>
        <span>Free Flow</span>
      </div>
    </div>
  );
};

export default TrafficCard; 