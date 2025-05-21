import { supabase } from "@/integrations/supabase/client";

// API handler for setting the current user as admin
export async function handler(req: Request) {
  try {
    // Get session to check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return Response.json({ 
        success: false, 
        message: "Not authenticated" 
      }, { status: 401 });
    }
    
    // Check if the user is the specified email
    const userEmail = session.user.email;
    if (userEmail !== 'seth@bambl.ing') {
      return Response.json({ 
        success: false, 
        message: "Not authorized to become admin" 
      }, { status: 403 });
    }
    
    // Update the profile to set admin status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError);
      return Response.json({ 
        success: false, 
        message: `Database error: ${profileError.message}` 
      }, { status: 500 });
    }
    
    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([
          { 
            id: session.user.id,
            email: userEmail,
            username: 'admin',
            full_name: 'Site Admin',
            is_admin: true 
          }
        ])
        .select();
        
      if (createError) {
        console.error('Error creating profile:', createError);
        return Response.json({ 
          success: false, 
          message: `Failed to create profile: ${createError.message}` 
        }, { status: 500 });
      }
      
      return Response.json({ 
        success: true, 
        message: "Admin profile created successfully", 
        data: newProfile 
      });
    }
    
    // If profile exists but is not admin, update it
    if (!profileData?.is_admin) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          is_admin: true,
          username: profileData?.username || 'admin',
          full_name: profileData?.full_name || 'Site Admin'
        })
        .eq('id', session.user.id)
        .select();
        
      if (updateError) {
        console.error('Error updating profile:', updateError);
        return Response.json({ 
          success: false, 
          message: `Failed to update profile: ${updateError.message}` 
        }, { status: 500 });
      }
      
      return Response.json({ 
        success: true, 
        message: "Admin status updated successfully", 
        data: updatedProfile 
      });
    }
    
    // If already an admin
    return Response.json({ 
      success: true, 
      message: "Already an admin", 
      data: profileData 
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({ 
      success: false, 
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
}
