import { v4 as uuidv4 } from 'uuid';
import { supabase, directSupabaseUrl } from '../supabase/client';

export const BUCKET_NAME = 'member-images';

/**
 * Extracts a clean storage path from any URL or raw path string.
 * Handles:
 * - Full URLs: https://baetdjjzfqupdzsoecph.supabase.co/storage/v1/object/public/member-images/aadhaar_123.jpg
 * - Dev proxy URLs: https://ais-dev-...run.app/supabase-proxy/storage/v1/object/public/member-images/aadhaar_123.jpg
 * - Localhost URLs: http://localhost:3000/supabase-proxy/...
 * - Direct paths: member-images/aadhaar_123.jpg or aadhaar_123.jpg
 */
export const extractStoragePath = (rawUrlOrPath: string | null | undefined): string => {
  if (!rawUrlOrPath) return '';
  const trimmed = rawUrlOrPath.trim();
  if (!trimmed) return '';

  // If it's a base64 or blob URL, return as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Look for member-images/ in the string
  const marker = `${BUCKET_NAME}/`;
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex !== -1) {
    const afterMarker = trimmed.slice(markerIndex + marker.length);
    // Strip query parameters if any (like ?token=...)
    return afterMarker.split('?')[0].split('#')[0];
  }

  // If it looks like a direct filename (e.g. aadhaar_...jpg)
  if (trimmed.startsWith('aadhaar_') || trimmed.includes('.jpg') || trimmed.includes('.png') || trimmed.includes('.jpeg') || trimmed.includes('.webp')) {
    const parts = trimmed.split('/');
    return parts[parts.length - 1].split('?')[0];
  }

  return trimmed;
};

/**
 * Generates a valid production URL or signed URL for an image stored in Supabase Storage.
 * Ensures the image loads even after deployment across different domains/environments.
 */
export const resolveAadhaarImageUrl = async (rawUrlOrPath: string | null | undefined): Promise<string> => {
  if (!rawUrlOrPath) return '';
  const trimmed = rawUrlOrPath.trim();
  if (!trimmed) return '';

  // Base64 or object URL can be rendered directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const cleanPath = extractStoragePath(trimmed);
  if (!cleanPath) return trimmed;

  try {
    // 1. First attempt: Generate an authenticated signed URL (valid for 1 hour)
    // This works securely even if the bucket is configured as private
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(cleanPath, 3600);

    if (!signedError && signedData?.signedUrl) {
      // Fix any dev proxy host in the signed URL to use the direct Supabase URL
      let resolvedSigned = signedData.signedUrl;
      if (resolvedSigned.includes('/supabase-proxy')) {
        resolvedSigned = resolvedSigned.replace(/\/supabase-proxy/g, '');
      }
      if (!resolvedSigned.startsWith('http')) {
        resolvedSigned = `${directSupabaseUrl}${resolvedSigned.startsWith('/') ? '' : '/'}${resolvedSigned}`;
      }
      return resolvedSigned;
    }

    if (signedError) {
      console.warn("Storage signed URL generation notice, falling back to public URL:", signedError.message);
    }
  } catch (err) {
    console.warn("Error requesting signed URL, using direct public endpoint fallback:", err);
  }

  // 2. Fallback: Generate the direct permanent Supabase public URL
  // Always use directSupabaseUrl to avoid broken localhost or dev proxy URLs in production
  return `${directSupabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${cleanPath}`;
};

/**
 * Uploads a member document (e.g. Aadhaar card) to Supabase Storage.
 * Returns the permanent direct production URL and the storage file path.
 */
export const uploadMemberImage = async (
  file: File, 
  prefix = 'aadhaar'
): Promise<{ publicUrl: string; path: string }> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Validate file type
  if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
    throw new Error('Invalid file format. Please upload a valid image file (JPG, PNG, WEBP).');
  }

  // Max 10MB file limit
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds the 10MB limit. Please choose a smaller image.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt) ? fileExt : 'jpg';
  const fileName = `${prefix}_${Date.now()}_${uuidv4().slice(0, 8)}.${cleanExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error("Supabase Storage upload fault:", error);
    throw new Error(`Upload Failed: ${error.message || 'Could not save file to storage bucket.'}`);
  }

  if (!data?.path) {
    throw new Error('Storage returned empty file path after upload.');
  }

  // Construct canonical production public URL
  const permanentPublicUrl = `${directSupabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${data.path}`;

  return {
    publicUrl: permanentPublicUrl,
    path: data.path
  };
};
