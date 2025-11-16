# Cloudinary Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file for local development, and to Vercel environment variables for production:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Setup Instructions

### 1. Create Cloudinary Account
- Go to https://cloudinary.com
- Sign up for free account
- Navigate to Dashboard

### 2. Get Cloud Name
- Found on dashboard homepage
- Format: `dxxxxxxxxx` or custom name
- Add to `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`

### 3. Create Upload Preset
- Go to Settings → Upload
- Scroll to "Upload presets"
- Click "Add upload preset"
- Set signing mode to "Unsigned"
- Name it (e.g., `agentos_preset`)
- Add to `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### 4. Get API Credentials
- Go to Settings → Access Keys
- Copy API Key → `CLOUDINARY_API_KEY`
- Copy API Secret → `CLOUDINARY_API_SECRET`
- **IMPORTANT:** Never expose API Secret in client-side code

## Folder Structure

Images are organized in Cloudinary folders:
- `/avatars` - User profile pictures
- `/properties` - Property listing images
- `/companies` - Company logos

## Image Transformations

The platform automatically applies optimizations:
- Auto format (WebP when supported)
- Auto quality
- Responsive sizing
- Lazy loading

## Security Notes

1. **Upload Preset** must be unsigned for client-side uploads
2. **API Secret** should NEVER be in client-side code
3. Deletion operations use server-side API route
4. Consider implementing signed uploads for production

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- Up to 25,000 total images
- All transformations included

Sufficient for initial launch and testing.

## Production Recommendations

1. Enable signed uploads for additional security
2. Set up folder access controls
3. Configure upload restrictions (file size, formats)
4. Enable moderation for user-generated content
5. Set up backup/migration strategy

## Vercel Setup

Add to Vercel environment variables:
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select appropriate environments (Production, Preview, Development)
4. Redeploy to apply changes
