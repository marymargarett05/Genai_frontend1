import { useEffect, useRef } from 'react';
import './VoiceAlert.css';

const VoiceAlert = ({ voiceAlert, riskLevel }) => {
  const speechSynthesisRef = useRef(window.speechSynthesis);

  useEffect(() => {
    const synthesis = speechSynthesisRef.current;

    const speak = (text) => {
      // Cancel any ongoing speech
      synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower than normal
      utterance.pitch = 1;
      utterance.volume = 1;

      // Use default system voice
      synthesis.speak(utterance);
    };

    // Only speak if we have a voice alert message and risk level is medium or high
    if (voiceAlert && (riskLevel === 'MEDIUM' || riskLevel === 'HIGH')) {
      speak(voiceAlert);
    }

    // Cleanup function
    return () => {
      synthesis.cancel();
    };
  }, [voiceAlert, riskLevel]);

  return null; // This component doesn't render anything
};

export default VoiceAlert; 


