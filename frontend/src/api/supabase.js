import { createClient } from '@supabase/supabase-js';
// variables are imported from our local .env file.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env'; 

// Client Initialization 
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents issues with deep linking/auth flow on mobile
  },
});

// Connection Test Function 
/**
 * A simple function to test if the Supabase connection is active and 
 * can read data from the history_cards table (read-only access).
 */

export const checkSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase
            .from('history_cards')
            .select('card_id')
            .limit(1);

        if (error) {
            console.error('Supabase connection test FAILED:', error.message);
            // Throwing an error here can alert the user if the server is down
            throw new Error(error.message);
        }
        
        console.log('✅ Supabase connected successfully.');
        return true;
        
    } catch (e) {
        console.error('Connection Test Exception:', e);
        return false;
    }
};