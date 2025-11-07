
# How to run 

Install a ```.env``` file in your ```.src``` folder and add these 2 keys to it:
```
SUPABASE_API_KEY = Your API KEY
SUPABASE_URL = Your URL
```
## Other Instructions

```landmarks``` table follows these variables:

 ```id| name | description | historical_context| latitude| longitude | detection_radius_meters | category | image_url |```

```landmarks_captures``` covers these variables:
```id| image_url | latitude | longitude| timestamp| landmark_id | user_id | distance_from_landmark_meters ```

user_id is not implemented yet, and distance_from_landmark is calculated and changed each time a picture is taken
