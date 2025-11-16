'use client';

import { useState, useRef } from 'react';
import { Camera, Loader, User } from 'lucide-react';
import { cloudinaryUploader, type CloudinaryUploadResult } from '@/lib/cloudinary';

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadComplete: (result: CloudinaryUploadResult) => void;
  onUploadError?: (error: string) => void;
  userId: string;
}

export default function AvatarUpload({
  currentAvatar,
  onUploadComplete,
  onUploadError,
  userId,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = cloudinaryUploader.validateFile(file);
    if (!validation.valid) {
      onUploadError?.(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploading(true);
    try {
      const result = await cloudinaryUploader.uploadFile(file, {
        folder: 'avatars',
        tags: ['avatar', `user_${userId}`],
      });

      onUploadComplete(result);
      setPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayImage = preview || currentAvatar;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Avatar Display */}
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
          {displayImage ? (
            <img
              src={displayImage}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-100">
              <User className="w-16 h-16 text-blue-600" />
            </div>
          )}
        </div>

        {/* Upload Button Overlay */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload Status */}
      {uploading && (
        <p className="text-sm text-gray-600">Uploading avatar...</p>
      )}

      {/* Guidelines */}
      <p className="text-xs text-gray-500 text-center max-w-xs">
        Click the camera icon to upload a new avatar.
        <br />
        Recommended: Square image, at least 400x400px
      </p>
    </div>
  );
}
