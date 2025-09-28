# Collection Images Directory

This directory contains thumbnail images for NFT collections in the swap pool interface.

## File Structure:
```
/public/images/collections/
├── default.png          # Default fallback image
├── stoner.png          # Stoner NFT collection
├── boat.png           # Boat NFT collection
└── [collection-name].png  # Additional collections
```

## Adding New Collection Images:

### Method 1: Using Image Files (Recommended)
1. Add your collection image file to this directory
2. Name it something descriptive (e.g., `my-collection.png`)
3. Update `/src/config/collectionImages.js` with the new collection data:

```javascript
'0xYourCollectionAddress': {
  name: 'Your Collection Name',
  image: 'https://your-primary-image-url.com/image.png', // Optional: External URL
  fallback: '/images/collections/your-collection.png',    // Local fallback
  description: 'Description of your collection'
},
```

### Method 2: Using External URLs Only
1. Update `/src/config/collectionImages.js` with just the external URL:

```javascript
'0xYourCollectionAddress': {
  name: 'Your Collection Name',
  image: 'https://your-image-url.com/image.png',
  description: 'Description of your collection'
},
```

## Image Requirements:
- **Format**: PNG, JPG, or WebP
- **Size**: Recommended 200x200px or higher (square aspect ratio)
- **File Size**: Keep under 1MB for faster loading
- **Background**: Transparent PNG recommended for best results

## Tips:
- Use descriptive filenames (avoid spaces, use hyphens)
- Test your images at different sizes (48px, 64px, etc.)
- Consider providing both light and dark theme compatible images
- External URLs are tried first, then local fallbacks