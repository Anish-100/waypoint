import { supabase } from './supabase'; // Imports the client setup from Step A

// Function to fetch all landmarks to plot on the map
export const fetchLandmarks = async () => {
    // Queries the history_cards table, selecting only the essential fields
    let { data, error } = await supabase
        .from('history_cards')
        .select('card_id, name, latitude, longitude'); 

    if (error) {
        console.error("Error fetching landmarks:", error);
        return [];
    }
    return data;
};

// Function to perform the check-in and update the user's progress
export const recordCollection = async (userId, cardId) => {
    // Calls the stored procedure you defined on the backend (Step 12)
    let { error } = await supabase.rpc('handle_card_collection', {
        p_user_id: userId,
        p_card_id: cardId
    });

    if (error) {
        // This is where you handle the "already collected" error from the function
        console.error("Collection failed:", error);
        return false;
    }
    return true;
};