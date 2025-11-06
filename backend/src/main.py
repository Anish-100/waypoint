from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import supabase, STORAGE_BUCKET, PHOTOS_FOLDER
from uuid import uuid4

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://waypoint-sk0h.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/v1/landmarks/identify")
async def identify_landmark(
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    timestamp: str = Form(None)  # Added this
):
    # STEP 1: Generate unique filename
    file_id = str(uuid4())
    file_name = f"{file_id}.jpg"
    
    # STEP 2: Define the path IN THE BUCKET
    storage_path = f"landmark-captures/{file_name}"
    
    # STEP 3: Read image content (FIX)
    image_content = await image.read()
    
    # STEP 4: Upload to Storage (FIX)
    supabase.storage.from_("game-assets").upload(
        storage_path,
        image_content,  # Changed from image.file
        {"content-type": "image/jpeg"}
    )
    
    # STEP 5: Get the URL
    image_url = supabase.storage.from_("game-assets").get_public_url(storage_path)
    
    # STEP 6: Save to Database Table with that URL
    result = supabase.table("landmark_captures").insert({
        "image_url": image_url,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": timestamp  # Added this
    }).execute()
    
    return {
        "success": True,
        "image_url": image_url,
        "record_id": result.data[0]["id"],
        "received": {"latitude": latitude, "longitude": longitude}
    }