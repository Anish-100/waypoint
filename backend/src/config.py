from dotenv import load_dotenv
import os
from supabase import create_client, Client
'''
Gets the URL's from the env file
'''
# Load environment variables from .env file
load_dotenv()

# Get values from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_API_KEY")

# Supabase storage configuration
STORAGE_BUCKET = "game-assets"  # Your bucket name
PHOTOS_FOLDER = "landmark_photos"  # Folder inside bucket

# Validate that required env vars are present
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing required environment variables. Check your .env file!")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("✓ Config loaded successfully")
print(f"✓ Storage bucket: {STORAGE_BUCKET}/{PHOTOS_FOLDER}")