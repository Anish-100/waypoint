from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import supabase, STORAGE_BUCKET, PHOTOS_FOLDER
from uuid import uuid4
import math
from typing import Optional

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://waypoint-1-r7sz.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== HELPER FUNCTIONS ==============

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates using Haversine formula
    Returns distance in meters
    """
    R = 6371e3  # Earth's radius in meters
    
    φ1 = math.radians(lat1)
    φ2 = math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    
    a = math.sin(Δφ/2) * math.sin(Δφ/2) + \
        math.cos(φ1) * math.cos(φ2) * \
        math.sin(Δλ/2) * math.sin(Δλ/2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance


def find_nearest_landmark(user_lat: float, user_lon: float):
    """
    Find the closest landmark within detection radius
    Returns landmark and distance, or None if no landmarks nearby
    """
    # Get all landmarks from Supabase
    response = supabase.table("landmarks").select("*").execute()
    landmarks = response.data
    
    closest_landmark = None
    min_distance = float('inf')
    
    for landmark in landmarks:
        distance = calculate_distance(
            user_lat, user_lon,
            landmark['latitude'], landmark['longitude']
        )
        
        # Check if within detection radius and closer than previous
        detection_radius = landmark.get('detection_radius_meters', 100)
        if distance <= detection_radius and distance < min_distance:
            min_distance = distance
            closest_landmark = landmark
    
    if closest_landmark:
        return {
            'landmark': closest_landmark,
            'distance': round(min_distance, 2)
        }
    
    return None


# ============== ENDPOINTS ==============

@app.post("/api/v1/landmarks/nearby")
async def check_nearby_landmarks(
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    """
    Check if there are any landmarks nearby (for preview before taking photo)
    """
    result = find_nearest_landmark(latitude, longitude)
    
    if result:
        return {
            "success": True,
            "landmark": {
                "id": result['landmark']['id'],
                "name": result['landmark']['name'],
                "description": result['landmark']['description'],
                "distance": result['distance']
            }
        }
    else:
        return {
            "success": False,
            "message": "No landmarks within 100 meters"
        }


@app.post("/api/v1/landmarks/identify")
async def identify_landmark(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(None)
):
    """
    Upload photo and check if near a landmark (simplified - no user tracking)
    """
    # STEP 1: Find nearest landmark
    nearest = find_nearest_landmark(latitude, longitude)
    
    if not nearest:
        raise HTTPException(
            status_code=400,
            detail="No landmarks within range. Get closer to a landmark to capture it!"
        )
    
    landmark = nearest['landmark']
    distance = nearest['distance']
    
    # STEP 2: Generate unique filename
    file_id = str(uuid4())
    file_name = f"{file_id}.jpg"
    
    # STEP 3: Define the path in the bucket
    storage_path = f"landmark-captures/{file_name}"
    
    # STEP 4: Read and upload image
    image_content = await image.read()
    
    supabase.storage.from_("game-assets").upload(
        storage_path,
        image_content,
        {"content-type": "image/jpeg"}
    )
    
    # STEP 5: Get the public URL
    image_url = supabase.storage.from_("game-assets").get_public_url(storage_path)
    
    # STEP 6: Save capture to database (without user_id)
    result = supabase.table("landmark_captures").insert({
        "landmark_id": landmark['id'],
        "image_url": image_url,
        "latitude": latitude,
        "longitude": longitude,
        "distance_from_landmark_meters": distance,
        "timestamp": timestamp
    }).execute()
    
    return {
        "success": True,
        "message": f"Successfully captured {landmark['name']}!",
        "landmark": {
            "id": landmark['id'],
            "name": landmark['name'],
            "description": landmark['description'],
            "historical_context": landmark.get('historical_context', ''),
            "category": landmark.get('category', ''),
            "image_url": landmark.get('image_url', ''),
            "distance": distance
        },
        "capture": {
            "id": result.data[0]["id"],
            "image_url": image_url,
            "captured_at": result.data[0].get("created_at")
        }
    }


@app.get("/api/v1/landmarks")
async def get_all_landmarks():
    """
    Get all available landmarks
    """
    response = supabase.table("landmarks").select("*").execute()
    
    return {
        "success": True,
        "landmarks": response.data
    }


@app.get("/api/v1/captures")
async def get_all_captures():
    """
    Get all landmark captures
    """
    response = supabase.table("landmark_captures").select(
        "*, landmarks(*)"
    ).execute()
    
    return {
        "success": True,
        "captures": response.data,
        "total": len(response.data)
    }