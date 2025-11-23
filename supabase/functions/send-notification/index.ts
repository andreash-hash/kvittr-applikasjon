import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = "289fa2eb-ba97-45e8-8328-08a11095772c";
const ONESIGNAL_REST_API_KEY = "os_v2_app_fcp2f252s5c6razabcqrbflxfthpzootrzoerzejzznrvkgby2kdesjxnuruwswcmzk4oo275x7pzfnintyabphzuhu3bvuciod4mka";

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

    // Get user's push token (player_id)
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id)
      .eq('enabled', true)
      .maybeSingle();

    if (tokenError) {
      console.error('Error fetching push token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      console.log('No push token found for user');
      return new Response(
        JSON.stringify({ error: 'No push token found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerId = tokenData.token;
    console.log('Found player_id:', playerId);

    // Send push notification via OneSignal REST API
    const oneSignalResponse = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: { en: title || 'Kvittr' },
        contents: { en: message },
        data: receipt_id ? { receipt_id } : undefined,
      }),
    });

    const oneSignalData = await oneSignalResponse.json();
    
    if (!oneSignalResponse.ok) {
      console.error('OneSignal error:', oneSignalData);
      return new Response(
        JSON.stringify({ error: 'Failed to send push notification', details: oneSignalData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Push notification sent successfully:', oneSignalData);

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
        notification_id: oneSignalData.id,
        recipients: oneSignalData.recipients 
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
