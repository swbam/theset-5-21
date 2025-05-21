import { supabase } from '@/integrations/supabase/client';

// Custom types to avoid dependency on Express
type CustomRequest = {
  method: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

type ApiResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

type CustomResponse = {
  status: (code: number) => CustomResponse;
  json: (data: ApiResponse) => void;
};

// API handler for setting admin status
export default async function handler(req: CustomRequest, res: CustomResponse) {
  try {
    // Get session to check authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated" 
      });
    }
    
    // Check if the user is the specified email
    const userEmail = session.user.email;
    if (userEmail !== 'seth@bambl.ing') {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to become admin" 
      });
    }
    
    // Update the profile to set admin status
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError);
      return res.status(500).json({ 
        success: false, 
        message: `Database error: ${profileError.message}` 
      });
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
        return res.status(500).json({ 
          success: false, 
          message: `Failed to create profile: ${createError.message}` 
        });
      }
      
      return res.status(200).json({ 
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
        return res.status(500).json({ 
          success: false, 
          message: `Failed to update profile: ${updateError.message}` 
        });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: "Admin status updated successfully", 
        data: updatedProfile 
      });
    }
    
    // If already an admin
    return res.status(200).json({ 
      success: true, 
      message: "Already an admin", 
      data: profileData 
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
}
