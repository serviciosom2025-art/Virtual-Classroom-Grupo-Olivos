import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Use regular client to verify the requesting user is an admin
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email, password, full_name, role } = await request.json();

    // Use admin client with service role key to create users
    const adminClient = createAdminClient();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the profile with the correct role using raw SQL to handle enum casting
    const { error: profileError } = await adminClient.rpc('update_user_profile', {
      user_id: authData.user.id,
      user_email: email,
      user_full_name: full_name,
      user_role: role
    });

    if (profileError) {
      // If RPC doesn't exist, try direct update
      const { error: directError } = await adminClient
        .from("profiles")
        .update({
          email,
          full_name,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);
      
      if (directError) {
        console.error("Profile update error:", directError);
      }
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
