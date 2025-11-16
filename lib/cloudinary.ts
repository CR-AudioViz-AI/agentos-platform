// Cloudinary configuration and upload utilities
// This uses Cloudinary's unsigned upload preset for client-side uploads

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
}

interface UploadOptions {
  folder?: string;
  tags?: string[];
  transformation?: string;
}

// Default Cloudinary config (will use env vars in production)
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export class CloudinaryUploader {
  private cloudName: string;
  private uploadPreset: string;

  constructor(cloudName?: string, uploadPreset?: string) {
    this.cloudName = cloudName || CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = uploadPreset || CLOUDINARY_UPLOAD_PRESET;
  }

  /**
   * Upload a single file to Cloudinary
   */
  async uploadFile(
    file: File,
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    if (options.transformation) {
      formData.append('transformation', options.transformation);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Upload failed');
    }

    return await response.json();
  }

  /**
   * Upload multiple files to Cloudinary
   */
  async uploadFiles(
    files: File[],
    options: UploadOptions = {}
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return await Promise.all(uploadPromises);
  }

  /**
   * Delete an image from Cloudinary by public_id
   */
  async deleteFile(publicId: string): Promise<void> {
    // Note: Deletion requires server-side implementation with API secret
    // This is a placeholder for the API route
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Generate optimized image URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: 'fill' | 'fit' | 'scale' | 'limit';
      quality?: 'auto' | number;
      format?: 'auto' | 'jpg' | 'png' | 'webp';
    } = {}
  ): string {
    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.crop) transformations.push(`c_${options.crop}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);

    const transformString = transformations.length > 0 ? `${transformations.join(',')}/` : '';

    return `https://res.cloudinary.com/${this.cloudName}/image/upload/${transformString}${publicId}`;
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(publicId: string): string {
    return this.getOptimizedUrl(publicId, {
      width: 300,
      height: 200,
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB',
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only JPEG, PNG, WebP, and GIF images are allowed',
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple files
   */
  validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    files.forEach((file, index) => {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        errors.push(`File ${index + 1}: ${validation.error}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export a default instance
export const cloudinaryUploader = new CloudinaryUploader();

// Export types
export type { CloudinaryUploadResult, UploadOptions };
