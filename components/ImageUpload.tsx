'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { cloudinaryUploader, type CloudinaryUploadResult } from '@/lib/cloudinary';

interface ImageUploadProps {
  onUploadComplete: (results: CloudinaryUploadResult[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  folder?: string;
  existingImages?: string[];
  onRemoveExisting?: (url: string) => void;
  label?: string;
  required?: boolean;
}

export default function ImageUpload({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  folder = 'properties',
  existingImages = [],
  onRemoveExisting,
  label = 'Property Images',
  required = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const totalFiles = selectedFiles.length + existingImages.length + fileArray.length;

    if (totalFiles > maxFiles) {
      onUploadError?.(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Validate files
    const validation = cloudinaryUploader.validateFiles(fileArray);
    if (!validation.valid) {
      onUploadError?.(validation.errors.join('\n'));
      return;
    }

    // Create previews
    const newPreviews: string[] = [];
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === fileArray.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles([...selectedFiles, ...fileArray]);
  }, [selectedFiles, previews, maxFiles, existingImages.length, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [handleFileChange]);

  const removeSelectedFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  }, [selectedFiles, previews]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const results: CloudinaryUploadResult[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const result = await cloudinaryUploader.uploadFile(selectedFiles[i], {
          folder,
          tags: ['property', 'listing'],
        });
        results.push(result);
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      onUploadComplete(results);
      
      // Clear selected files
      setSelectedFiles([]);
      setPreviews([]);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-sm text-gray-500">
          {existingImages.length + selectedFiles.length} / {maxFiles} images
        </span>
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {existingImages.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Existing ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(url)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                Uploaded
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Files Preview */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border-2 border-blue-500"
              />
              <button
                type="button"
                onClick={() => removeSelectedFile(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
                Pending
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {existingImages.length + selectedFiles.length < maxFiles && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, WebP or GIF (max 10MB each)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleUpload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'Image' : 'Images'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedFiles([]);
              setPreviews([]);
            }}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Image Guidelines:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Upload high-quality images (minimum 1200px width recommended)</li>
          <li>• First image will be used as the main property image</li>
          <li>• Maximum {maxFiles} images per listing</li>
          <li>• Images are automatically optimized for web</li>
        </ul>
      </div>
    </div>
  );
}
