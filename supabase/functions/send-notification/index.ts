import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { receipt_id, user_id, message, title } = await req.json();
    
    if (!user_id || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending notification to user:', user_id);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's FCM token from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profileData?.fcm_token) {
      console.log('No FCM token found for user');
      return new Response(
        JSON.stringify({ error: 'No FCM token found for user', user_id }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmToken = profileData.fcm_token;
    console.log('Found FCM token for user');

    // Get Firebase Server Key from secrets
    const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
    if (!firebaseServerKey) {
      console.error('FIREBASE_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Push notification service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notification via Firebase Cloud Messaging (FCM) Legacy API
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${firebaseServerKey}`,
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title: title || 'Kvittr',
          body: message,
          sound: 'default',
        },
        data: receipt_id ? { receipt_id } : {},
        // iOS specific settings
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      }),
    });

    const fcmData = await fcmResponse.json();
    console.log('FCM response:', JSON.stringify(fcmData));
    
    if (!fcmResponse.ok) {
      console.error('FCM error:', fcmData);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: fcmData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check FCM response for delivery errors
    if (fcmData.failure > 0) {
      console.error('FCM delivery failed:', fcmData.results);
      
      // If token is invalid, clear it from the profile
      const results = fcmData.results || [];
      const invalidTokenErrors = ['InvalidRegistration', 'NotRegistered', 'MismatchSenderId'];
      
      for (const result of results) {
        if (result.error && invalidTokenErrors.includes(result.error)) {
          console.log('Clearing invalid FCM token for user:', user_id);
          await supabase
            .from('profiles')
            .update({ fcm_token: null })
            .eq('id', user_id);
          break;
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Push notification delivery failed', details: fcmData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Push notification sent successfully');

    // Log notification to database
    if (receipt_id) {
      await supabase.from('notifications').insert({
        user_id,
        receipt_id,
        notification_type: 'expiry_warning',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: fcmData.results?.[0]?.message_id,
        multicast_id: fcmData.multicast_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
