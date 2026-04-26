// Deletes the authenticated user's account and all their data.
// Uses service role key to bypass RLS, then calls auth.admin.deleteUser.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Verify the calling user's JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Delete storage objects (receipt images)
  const { data: storageFiles } = await adminClient.storage
    .from('receipts')
    .list(user.id);

  if (storageFiles && storageFiles.length > 0) {
    const paths = storageFiles.map((f) => `${user.id}/${f.name}`);
    await adminClient.storage.from('receipts').remove(paths);
  }

  // Cascade delete: receipts + notifications via RLS/FK; profile via trigger
  await adminClient.from('receipts').delete().eq('user_id', user.id);
  await adminClient.from('notifications').delete().eq('user_id', user.id);
  await adminClient.from('profiles').delete().eq('id', user.id);

  // Hard-delete the auth user
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
