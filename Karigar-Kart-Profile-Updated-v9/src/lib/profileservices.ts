import { supabase } from './supabase';

export interface ProfileInput {
  name: string;
  role?: string;       // Default: 'artisan'
  language?: string;   // e.g., 'en', 'hi'
}

export interface ArtisanInput {
  craft_type?: string;
  region?: string;
  verification_status?: string; // e.g., 'Pending', 'Verified'
  story?: string;
}

/**
 * Creates a Profile and associated Artisan entry in Supabase
 */
export async function createArtisanProfile(
  profileData: ProfileInput,
  artisanData: ArtisanInput
) {
  // 1. Insert into profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        name: profileData.name,
        role: profileData.role || 'artisan',
        language: profileData.language || 'en'
      }
    ])
    .select()
    .single();

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
    return { success: false, error: profileError };
  }

  // 2. Insert into artisans table using the generated profile.id
  const { data: artisan, error: artisanError } = await supabase
    .from('artisans')
    .insert([
      {
        profile_id: profile.id,
        craft_type: artisanData.craft_type || '',
        region: artisanData.region || '',
        verification_status: artisanData.verification_status || 'Pending',
        story: artisanData.story || ''
      }
    ])
    .select()
    .single();

  if (artisanError) {
    console.error('Error creating artisan entry:', artisanError.message);
    return { success: false, error: artisanError };
  }

  return { 
    success: true, 
    data: { profile, artisan } 
  };
}