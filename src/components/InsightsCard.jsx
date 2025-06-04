import React from 'react';
import './InsightsCard.css';

const InsightsCard = ({ insights }) => {
  if (!insights || !insights.length) return null;

  // Function to get emoji based on insight type
  const getInsightEmoji = (type) => {
    switch (type.toLowerCase()) {
      case 'weather': return '🌤️';
      case 'traffic': return '🚦';
      case 'time': return '⏰';
      case 'location': return '📍';
      default: return '💡';
    }
  };

  return (
    <div className="insights-card">
      <h3>💡 Risk Insights</h3>
      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className="insight-item">
            <div className="insight-icon">
              {getInsightEmoji(insight.type)}
            </div>
            <div className="insight-content">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-description">{insight.description}</div>
              {insight.recommendation && (
                <div className="insight-recommendation">
                  <strong>Recommendation:</strong> {insight.recommendation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsCard; 