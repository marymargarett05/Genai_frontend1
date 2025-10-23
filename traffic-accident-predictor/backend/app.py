from flask import Flask, request, jsonify
from flask_cors import CORS
from joblib import load
import torch
import numpy as np
import requests
import os
from datetime import datetime
from dotenv import load_dotenv
from gtts import gTTS
import io
import base64
import re
import math

#  Flask app
app = Flask(__name__)

# Configure CORS properly
CORS(app, resources={
    r"/*": {  # Allow all routes
        "origins": ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 3600
    }
})

# Load environment variables
load_dotenv()

# Configuration
app.config['OPENWEATHERMAP_KEY'] = os.getenv('OPENWEATHERMAP_KEY', '8407cb6677f41d255f58a5d6789b601e')
app.config['TOMTOM_KEY'] = os.getenv('TOMTOM_KEY', 'VLY170Ef4AqkV1nn8e6ffqFt0aXPwMq0')

# Initialize models as a global variable
models = None

# Add after models initialization
safety_advice_templates = None

def load_safety_advice():
    global safety_advice_templates
    try:
        print("\nLoading safety advice templates...")
        safety_advice_templates = {}
        current_section = None
        current_advice = []
        
        with open('models/safety_advice.txt', 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                    
                if line.startswith('[') and line.endswith(']'):
                    if current_section:
                        safety_advice_templates[current_section] = current_advice
                    current_section = line[1:-1]
                    current_advice = []
                elif line.startswith('•'):
                    current_advice.append(line)
            
            # Add the last section
            if current_section:
                safety_advice_templates[current_section] = current_advice
                
        print(f"Loaded {len(safety_advice_templates)} safety advice templates")
        return True
    except Exception as e:
        print(f"Error loading safety advice templates: {e}")
        return False

# Model loading with error handling
def load_models():
    global models
    try:
        print("\n=== Loading Models ===")
        models = {}
        
        # Load ML model
        print("Loading ML model...")
        try:
            models['ml_model'] = load('models/ml_model.pkl')
            print("Loaded ml_model.pkl successfully")
            print(f"ML model type: {type(models['ml_model'])}")
            if not hasattr(models['ml_model'], 'predict_proba'):
                raise Exception("Loaded model does not have predict_proba method")
        except Exception as e:
            print(f"Error loading ml_model.pkl: {e}")
            raise Exception("Failed to load ML model")
        
        # Load encoders
        print("\nLoading risk label encoder...")
        try:
            models['risk_encoder'] = load('models/risk_label_encoder.pkl')
            print(f"Risk encoder loaded successfully. Classes: {models['risk_encoder'].classes_}")
        except Exception as e:
            print(f"Error loading risk encoder: {e}")
            raise
        
        print("\nLoading weather label encoder...")
        try:
            models['weather_encoder'] = load('models/weather_label_encoder.pkl')
            print(f"Weather encoder loaded successfully. Classes: {models['weather_encoder'].classes_}")
        except Exception as e:
            print(f"Error loading weather encoder: {e}")
            raise
        
        print("\nLoading genai model...")
        try:
            models['genai_model'] = torch.load('models/genai_model.pth', map_location=torch.device('cpu'))
            print("GenAI model loaded successfully")
        except Exception as e:
            print(f"Error loading genai model: {e}")
            raise
        
        # Load safety advice templates
        if not load_safety_advice():
            print("Warning: Failed to load safety advice templates")
        
        print("\n=== All models and templates loaded successfully ===")
        return models
    except Exception as e:
        print(f"\nError loading models: {str(e)}")
        print(f"Error type: {type(e)}")
        models = None
        return None

# Load models at startup
print("\n=== Starting Server ===")
models = load_models()
if not models:
    print("ERROR: Failed to load models. Server may not function correctly.")
else:
    print("Server started successfully with all models loaded.")

# API Routes
@app.route('/')
def home():
    return jsonify({
        "status": "Server is running",
        "models_loaded": bool(models),
        "available_endpoints": {
            "health_check": "/api/health (GET)",
            "prediction": "/api/predict (POST)"
        }
    })

@app.route('/favicon.ico')
def favicon():
    return '', 404  # Explicitly return empty response for favicon

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    print("\n=== New Prediction Request ===")
    print("Request method:", request.method)
    print("Request headers:", dict(request.headers))
    
    # Handle preflight request
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3002'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response

    try:
        # Check if models are loaded
        if not models:
            print("ERROR: Models dictionary is None")
            return jsonify({"error": "Models not loaded"}), 500
            
        print("Available models:", list(models.keys()))
        
        # Parse request data
        try:
            data = request.get_json()
            print("Received JSON data:", data)
        except Exception as e:
            print(f"ERROR: Failed to parse JSON data: {e}")
            return jsonify({"error": "Invalid JSON data"}), 400
            
        if not data:
            print("ERROR: No JSON data received")
            return jsonify({"error": "No data received"}), 400
            
        # Validate coordinates
        if 'latitude' not in data or 'longitude' not in data:
            print("ERROR: Missing coordinates in data:", data)
            return jsonify({"error": "Missing latitude or longitude"}), 400

        try:
            lat = float(data['latitude'])
            lon = float(data['longitude'])
            print(f"Parsed coordinates: lat={lat}, lon={lon}")
        except (ValueError, TypeError) as e:
            print(f"ERROR: Invalid coordinates: {e}")
            return jsonify({"error": "Invalid latitude or longitude values"}), 400

        # Validate coordinate ranges
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            print(f"ERROR: Coordinates out of range: lat={lat}, lon={lon}")
            return jsonify({"error": "Coordinates out of valid range"}), 400

        # Get weather data
        print("\nFetching weather data...")
        weather_data = generate_weather_data(lat, lon)
        if not weather_data:
            print("ERROR: Failed to fetch weather data")
            return jsonify({"error": "Failed to fetch weather data"}), 500
        print("Weather data:", weather_data)

        # Get traffic data
        print("\nFetching traffic data...")
        traffic_data = generate_traffic_data(lat, lon)
        if not traffic_data:
            print("ERROR: Failed to fetch traffic data")
            return jsonify({"error": "Failed to fetch traffic data"}), 500
        print("Traffic data:", traffic_data)

        # Make prediction
        print("\nMaking prediction...")
        try:
            prediction = make_prediction(lat, lon, weather_data, traffic_data)
            print(f"Prediction successful: {prediction}")
        except Exception as e:
            print(f"ERROR: Prediction failed: {str(e)}")
            print(f"Error type: {type(e)}")
            import traceback
            print("Traceback:", traceback.format_exc())
            return jsonify({"error": f"Failed to make prediction: {str(e)}"}), 500

        # Generate insights with more detailed information
        print("\nGenerating insights...")
        insights_data = generate_insights(prediction, weather_data, traffic_data)
        print("Insights:", insights_data)

        # Generate voice alert
        print("\nGenerating voice alert...")
        voice_alert = generate_voice_alert(insights_data)
        print("Voice alert:", voice_alert)

        response_data = {
            "prediction": float(prediction),
            "weather_data": weather_data,
            "traffic_data": traffic_data,
            "insights": insights_data,
            "voice_alert": voice_alert,  # Now just a string
            "risk_level": insights_data.get('risk_level', 'UNKNOWN'),
            "probability": insights_data.get('probability', 0.0)
        }
        print("\nSending response:", response_data)
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3002'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"\nERROR: Unexpected error in prediction endpoint: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print("Traceback:", traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

def generate_weather_data(lat, lon):
    try:
        # Use location coordinates to influence weather patterns
        # Create unique weather patterns based on location
        location_factor = (lat + lon) / 200  # Normalize location factor
        
        # Time-based variations
        current_hour = datetime.now().hour
        time_factor = math.sin(current_hour * math.pi / 12)  # Daily cycle
        
        # Location-specific base temperatures
        base_temp = 25.0 + (lat * 0.2)  # Temperature varies with latitude
        temp_variation = 5.0 * math.sin(time_factor + location_factor)
        temperature = round(base_temp + temp_variation, 1)
        
        # Location-specific wind patterns
        base_wind = 10.0 + (abs(lon) * 0.1)  # Wind varies with longitude
        wind_variation = 3.0 * math.sin(time_factor * 2 + location_factor)
        wind_speed = round(base_wind + wind_variation, 1)
        
        # Location-specific precipitation
        precip_base = abs(lat * 0.1)  # More precipitation near equator
        precip_variation = 2.0 * math.sin(time_factor * 3 + location_factor)
        precipitation = round(max(0, precip_base + precip_variation), 1)
        
        # Location-specific visibility
        visibility_base = 10.0 - (abs(lat) * 0.05)  # Visibility varies with latitude
        visibility_variation = 2.0 * math.sin(time_factor + location_factor)
        visibility = round(max(1, min(10, visibility_base + visibility_variation)), 1)
        
        # Location-specific humidity
        humidity_base = 65.0 + (lat * 0.5)  # Humidity varies with latitude
        humidity_variation = 10.0 * math.sin(time_factor + location_factor)
        humidity = round(max(30, min(100, humidity_base + humidity_variation)), 1)
        
        # Determine conditions based on actual values
        conditions = "Sunny"
        if precipitation > 2.0:
            conditions = "Rainy"
        elif precipitation > 0.5:
            conditions = "Light Rain"
        elif visibility < 3.0:
            conditions = "Foggy"
        elif temperature < 0:
            conditions = "Snowy"
        elif temperature > 30:
            conditions = "Hot"
            
        return {
            "temperature": temperature,
            "wind_speed": wind_speed,
            "precipitation": precipitation,
            "visibility": visibility,
            "humidity": humidity,
            "conditions": conditions
        }
    except Exception as e:
        print(f"Weather generation error: {e}")
        return get_default_weather_data()

def generate_traffic_data(lat, lon):
    try:
        # Use location coordinates to influence traffic patterns
        location_factor = (lat + lon) / 200  # Normalize location factor
        
        # Time-based variations
        current_hour = datetime.now().hour
        time_factor = math.sin(current_hour * math.pi / 12)  # Daily cycle
        
        # Location-specific traffic patterns
        # Urban areas (near 0,0) have more traffic
        urban_factor = 1 - (abs(lat) + abs(lon)) / 180  # Higher near 0,0
        
        # Base traffic speed varies with location
        base_speed = 60.0 - (urban_factor * 30)  # Lower speeds in urban areas
        speed_variation = 10.0 * math.sin(time_factor + location_factor)
        flow_speed = round(max(5, min(120, base_speed + speed_variation)), 1)
        
        # Congestion percentage based on location and time
        congestion_base = urban_factor * 50  # Higher congestion in urban areas
        congestion_variation = 20.0 * math.sin(time_factor * 2 + location_factor)
        congestion_percentage = round(max(0, min(100, congestion_base + congestion_variation)), 1)
        
        # Determine congestion level
        congestion_level = "Low"
        if congestion_percentage >= 70:
            congestion_level = "High"
        elif congestion_percentage >= 40:
            congestion_level = "Moderate"
            
        return {
            "flow_speed": flow_speed,
            "congestion_level": congestion_level,
            "congestion_percentage": congestion_percentage
        }
    except Exception as e:
        print(f"Traffic generation error: {e}")
        return get_default_traffic_data()

def make_prediction(lat, lon, weather_data, traffic_data):
    try:
        print("\n=== Starting Prediction Process ===")
        print("\nInput Conditions:")
        print(f"Location: ({lat}, {lon})")
        print("Weather Data:", weather_data)
        print("Traffic Data:", traffic_data)
        
        # Validate models
        if not models:
            print("ERROR: Models dictionary is None")
            raise Exception("Models not loaded")
            
        if 'ml_model' not in models:
            print("ERROR: ml_model not found in models dictionary")
            print("Available models:", list(models.keys()))
            raise Exception("ML model not loaded")

        # Log model information
        print("\nModel Information:")
        print(f"Model type: {type(models['ml_model'])}")
        if hasattr(models['ml_model'], 'n_features_in_'):
            print(f"Expected number of features: {models['ml_model'].n_features_in_}")
        if hasattr(models['ml_model'], 'feature_names_in_'):
            print(f"Expected feature names: {models['ml_model'].feature_names_in_}")
        if hasattr(models['ml_model'], 'classes_'):
            print(f"Model classes: {models['ml_model'].classes_}")

        # Prepare features with validation
        print("\nPreparing features...")
        try:
            # First, prepare all possible features
            all_features = {
                'latitude': float(lat),
                'longitude': float(lon),
                'temperature': float(weather_data.get('temperature', 0)),
                'humidity': float(weather_data.get('humidity', 0)),
                'wind_speed': float(weather_data.get('wind_speed', 0)),
                'visibility': float(weather_data.get('visibility', 0)),
                'precipitation': float(weather_data.get('precipitation', 0)),
                'traffic_speed': float(traffic_data.get('flow_speed', 0))
            }
            print("\nPrepared Features:")
            for feature, value in all_features.items():
                print(f"{feature}: {value}")

            # Define the expected feature order based on the model's training
            expected_features = [
                'latitude',
                'longitude',
                'temperature',
                'humidity',
                'wind_speed',
                'visibility',
                'precipitation',
                'traffic_speed'
            ]

            print("\nPreparing feature array with expected features:", expected_features)
            
            # Create feature array with only the expected features
            X = np.array([[all_features[f] for f in expected_features]], dtype=float)
            print("\nFeature array shape:", X.shape)
            print("Feature array values:", X[0])
            
            # Validate array
            if np.isnan(X).any():
                raise ValueError("Feature array contains NaN values")
            if np.isinf(X).any():
                raise ValueError("Feature array contains infinite values")
            
            # Make prediction
            if not hasattr(models['ml_model'], 'predict_proba'):
                raise AttributeError("Model does not have predict_proba method")
                
            try:
                # Get both probability and class prediction
                probabilities = models['ml_model'].predict_proba(X)[0]
                prediction = probabilities[1]  # Probability of high risk
                predicted_class = models['ml_model'].predict(X)[0]
                
                print("\nPrediction Results:")
                print(f"Raw probabilities: {probabilities}")
                print(f"Predicted class: {predicted_class}")
                print(f"Risk probability: {prediction:.4f}")
                
                # Validate prediction
                if not isinstance(prediction, (int, float)):
                    raise ValueError(f"Invalid prediction type: {type(prediction)}")
                if not 0 <= prediction <= 1:
                    raise ValueError(f"Prediction out of range [0,1]: {prediction}")
                    
                print(f"Final prediction value: {prediction:.4f}")
                return float(prediction)
                
            except Exception as e:
                print(f"ERROR: Model prediction failed: {e}")
                print(f"Model type: {type(models['ml_model'])}")
                print(f"Model attributes: {[attr for attr in dir(models['ml_model']) if not attr.startswith('_')]}")
                raise
                
        except Exception as e:
            print(f"ERROR: Failed to prepare feature array or make prediction: {e}")
            print(f"Error type: {type(e)}")
            raise

    except Exception as e:
        print(f"\nERROR: Prediction process failed: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        print("Traceback:", traceback.format_exc())
        raise

def get_safety_advice(conditions, risk_level):
    try:
        if not safety_advice_templates:
            return ["Unable to load safety advice templates"]
            
        advice = []
        
        # Add risk level based advice
        risk_key = f"RISK_{risk_level}"
        if risk_key in safety_advice_templates:
            advice.extend(safety_advice_templates[risk_key])
        
        # Add weather based advice
        weather_condition = conditions.get('conditions', 'Sunny').lower()
        if weather_condition == 'rainy':
            advice.extend(safety_advice_templates.get('WEATHER_RAINY', []))
        elif weather_condition == 'foggy':
            advice.extend(safety_advice_templates.get('WEATHER_FOGGY', []))
        elif weather_condition == 'snowy':
            advice.extend(safety_advice_templates.get('WEATHER_SNOWY', []))
            
        temp = conditions.get('temperature', 25)
        if temp > 35:
            advice.extend(safety_advice_templates.get('WEATHER_HOT', []))
        elif temp < 5:
            advice.extend(safety_advice_templates.get('WEATHER_COLD', []))
            
        # Add traffic based advice
        traffic_congestion = conditions.get('congestion_level', 'Low')
        if traffic_congestion == 'High':
            advice.extend(safety_advice_templates.get('TRAFFIC_HEAVY', []))
        elif traffic_congestion == 'Moderate':
            advice.extend(safety_advice_templates.get('TRAFFIC_MODERATE', []))
        else:
            advice.extend(safety_advice_templates.get('TRAFFIC_LIGHT', []))
            
        # Add combined conditions advice
        if (conditions.get('precipitation', 0) > 0 and 
            conditions.get('flow_speed', 45) > 60):
            advice.extend(safety_advice_templates.get('COMBINED_WET_HIGH_SPEED', []))
            
        if (conditions.get('visibility', 10) < 5 and 
            conditions.get('congestion_level', 'Low') == 'High'):
            advice.extend(safety_advice_templates.get('COMBINED_POOR_VISIBILITY_HEAVY_TRAFFIC', []))
            
        if (conditions.get('wind_speed', 10) > 15 and 
            conditions.get('flow_speed', 45) > 50):
            advice.extend(safety_advice_templates.get('COMBINED_STRONG_WIND_HIGH_SPEED', []))
            
        # Add time based advice
        current_hour = datetime.now().hour
        if 5 <= current_hour <= 7:
            advice.extend(safety_advice_templates.get('TIME_EARLY_MORNING', []))
        elif 17 <= current_hour <= 19:
            advice.extend(safety_advice_templates.get('TIME_RUSH_HOUR', []))
        elif 22 <= current_hour <= 4:
            advice.extend(safety_advice_templates.get('TIME_NIGHT', []))
            
        # Remove duplicates while preserving order
        seen = set()
        unique_advice = []
        for item in advice:
            if item not in seen:
                seen.add(item)
                unique_advice.append(item)
                
        return unique_advice
    except Exception as e:
        print(f"Error getting safety advice: {e}")
        return ["Unable to generate safety advice"]

def generate_insights(prediction, weather_data, traffic_data):
    try:
        risk_level = "LOW"
        if prediction >= 0.7:
            risk_level = "HIGH"
        elif prediction >= 0.4:
            risk_level = "MEDIUM"
            
        # Get current conditions
        conditions = weather_data.get('conditions', 'Sunny')
        temp = weather_data.get('temperature', 25.0)
        wind_speed = weather_data.get('wind_speed', 10.0)
        visibility = weather_data.get('visibility', 10.0)
        precipitation = weather_data.get('precipitation', 0.0)
        traffic_speed = traffic_data.get('flow_speed', 45.0)
        congestion = traffic_data.get('congestion_percentage', 25)
        
        # Generate concise safety message (40-50 words)
        safety_message = []
        
        # Risk level and primary condition
        if risk_level == "HIGH":
            safety_message.append("High accident risk detected. ")
        elif risk_level == "MEDIUM":
            safety_message.append("Moderate accident risk. ")
        else:
            safety_message.append("Low accident risk. ")
            
        # Weather impact
        if conditions.lower() == 'rainy':
            safety_message.append(f"Rainy conditions with {precipitation:.1f}mm precipitation. ")
        elif conditions.lower() == 'foggy':
            safety_message.append(f"Foggy with {visibility:.1f}km visibility. ")
        elif conditions.lower() == 'snowy':
            safety_message.append(f"Snowy conditions at {temp:.1f}°C. ")
        elif conditions.lower() == 'hot':
            safety_message.append(f"Hot conditions at {temp:.1f}°C. ")
            
        # Traffic impact
        if congestion >= 70:
            safety_message.append(f"Heavy traffic with {congestion}% congestion. ")
        elif congestion >= 40:
            safety_message.append(f"Moderate traffic with {congestion}% congestion. ")
            
        # Key safety advice
        if conditions.lower() in ['rainy', 'snowy']:
            safety_message.append("Reduce speed and maintain safe distance. ")
        elif conditions.lower() == 'foggy':
            safety_message.append("Use headlights and reduce speed. ")
        elif wind_speed > 15:
            safety_message.append(f"Strong winds at {wind_speed:.1f}m/s require extra caution. ")
            
        # Combine message and ensure it's between 40-50 words
        message = "".join(safety_message)
        word_count = len(message.split())
        
        if word_count > 50:
            # Trim to 50 words
            words = message.split()[:50]
            message = " ".join(words) + "."
        elif word_count < 40:
            # Add essential safety reminder
            message += "Stay alert and follow traffic rules."
            
        return {
            "risk_level": risk_level,
            "insights": [message],
            "probability": float(prediction * 100)
        }
    except Exception as e:
        print(f"Insights generation error: {e}")
        return {
            "risk_level": "UNKNOWN",
            "insights": ["Unable to generate insights"],
            "probability": 0.0
        }

def generate_voice_alert(insights):
    try:
        # Get just the message from insights
        message = insights.get('insights', [''])[0]  # Get the concise message
        
        # Return just the message string
        return message
    except Exception as e:
        print(f"Voice alert generation error: {e}")
        return "Unable to generate voice alert"

# Health check endpoint
@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    if request.method == 'OPTIONS':
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3002'))
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        return response

    model_status = {
        "ml_model": 'ml_model' in models if models else False,
        "risk_encoder": 'risk_encoder' in models if models else False,
        "weather_encoder": 'weather_encoder' in models if models else False,
        "genai_model": 'genai_model' in models if models else False
    }
    
    response = jsonify({
        "status": "healthy" if models else "unhealthy",
        "models_loaded": bool(models),
        "model_status": model_status
    })
    response.headers.add('Access-Control-Allow-Origin', request.headers.get('Origin', 'http://localhost:3002'))
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    print("\n=== Server Configuration ===")
    print("Host: 0.0.0.0")
    print("Port: 5000")
    print("Debug mode: True")
    print("CORS enabled: True")
    print("Allowed origins: http://localhost:3000, http://localhost:3001, http://localhost:3002")
    print("\nStarting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
