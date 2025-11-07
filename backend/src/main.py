from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import supabase, STORAGE_BUCKET, PHOTOS_FOLDER
from uuid import uuid4

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://waypoint-1-r7sz.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/landmarks/identify")
async def identify_landmark(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(None)
):
    file_id = str(uuid4())
    file_name = f"{file_id}.jpg"
    storage_path = f"landmark-captures/{file_name}"
    
    image_content = await image.read()
    
    supabase.storage.from_("game-assets").upload(
        storage_path,
        image_content,
        {"content-type": "image/jpeg"}
    )
    
    image_url = supabase.storage.from_("game-assets").get_public_url(storage_path)
    
    result = supabase.table("landmark_captures").insert({
        "image_url": image_url,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": timestamp
    }).execute()
    
    return {
        "success": True,
        "image_url": image_url,
        "record_id": result.data[0]["id"],
        "received": {"latitude": latitude, "longitude": longitude}
    }

# NEW ENDPOINT: Fetch user's landmark collection
@app.get("/api/v1/landmarks/collection")
async def get_landmark_collection():
    try:
        # Fetch all landmarks from database, ordered by most recent first
        result = supabase.table("landmark_captures") \
            .select("*") \
            .order("created_at", desc=True) \
            .execute()
        
        return {
            "success": True,
            "landmarks": result.data,
            "count": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))