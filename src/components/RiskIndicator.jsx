import React from 'react';
import './RiskIndicator.css';

const RiskIndicator = ({ prediction, insights, voiceAlert }) => {
  const getRiskColor = () => {
    const riskLevel = insights?.risk_level?.toLowerCase() || 'low';
    switch (riskLevel) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffbb33';
      case 'low': return '#00C851';
      default: return '#aaaaaa';
    }
  };

  const getRiskIcon = () => {
    const riskLevel = insights?.risk_level?.toLowerCase() || 'low';
    switch (riskLevel) {
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '✅';
      default: return '❓';
    }
  };

  return (
    <div className="risk-indicator">
      <h3>Accident Risk Assessment</h3>
      <div className="risk-meter">
        <div 
          className="risk-level" 
          style={{ 
            backgroundColor: getRiskColor(),
            width: `${insights?.probability || 0}%`
          }}
        ></div>
      </div>
      <div className="risk-details">
        <span className="risk-label">
          {getRiskIcon()} {insights?.risk_level || 'UNKNOWN'} RISK
        </span>
        <span className="risk-value">{insights?.probability?.toFixed(1)}% probability</span>
      </div>
      
      {/* Insights Section */}
      {insights?.insights && insights.insights.length > 0 && (
        <div className="insights-section">
          <h4>Safety Insights</h4>
          <ul className="insights-list">
            {insights.insights.map((insight, index) => (
              <li key={index} className="insight-item">{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Voice Alert Section */}
      {voiceAlert && (
        <div className="voice-alert-section">
          <h4>Voice Alert</h4>
          <p className="voice-alert-text">{voiceAlert}</p>
          <button 
            className="play-alert-button"
            onClick={() => {
              const utterance = new SpeechSynthesisUtterance(voiceAlert);
              window.speechSynthesis.speak(utterance);
            }}
          >
            🔊 Play Alert
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskIndicator; 

