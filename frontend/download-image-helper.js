// Image Download Helper Script
// 
// If you have the image URL, you can use this script to download it
// Replace 'YOUR_IMAGE_URL' with the actual URL of your boat image

const downloadImage = async (imageUrl, filename) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`✅ Downloaded ${filename} successfully!`);
  } catch (error) {
    console.error('❌ Download failed:', error);
  }
};

// Usage example:
// downloadImage('https://your-image-url.com/boat.png', 'meme-runner.png');

// Instructions:
// 1. Open browser console (F12)
// 2. Copy and paste this entire script
// 3. Replace 'YOUR_IMAGE_URL' with your actual image URL
// 4. Run: downloadImage('YOUR_IMAGE_URL', 'meme-runner.png')
// 5. Save the downloaded file to: frontend/public/images/collections/

console.log('🚤 Image download helper loaded! Use downloadImage(url, filename) to download.');