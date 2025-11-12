# PWA Icons

This directory should contain the PWA app icons in various sizes.

## Required Icon Sizes

The following icon sizes are required for optimal PWA support across all devices:

- `icon-72x72.png` - Small icon for older devices
- `icon-96x96.png` - Standard icon
- `icon-128x128.png` - Standard icon
- `icon-144x144.png` - Windows tile
- `icon-152x152.png` - iOS home screen
- `icon-192x192.png` - Android home screen (required)
- `icon-384x384.png` - Larger icon
- `icon-512x512.png` - Splash screens (required)

## How to Generate Icons

You can use the following tools to generate PWA icons from a single source image:

1. **PWA Asset Generator** (Recommended)
   ```bash
   npx @vite-pwa/assets-generator --preset minimal public/placeholder-logo.png
   ```

2. **Online Tools**
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [PWA Builder](https://www.pwabuilder.com/imageGenerator)
   - [Favicon.io](https://favicon.io/)

## Design Guidelines

- **Size**: Start with a square image of at least 512x512 pixels
- **Format**: PNG with transparent background
- **Safe Zone**: Keep important content within 80% of the image to avoid cropping
- **Colors**: Use the CÁRIS brand colors (primary: #8B5CF6)
- **Style**: Simple, recognizable icon that works at small sizes

## Maskable Icons

All icons are marked as "maskable" in the manifest, which means:
- The icon should have some padding/safe zone
- The icon can be cropped into different shapes (circle, square, rounded square)
- The important content should be in the center 80% of the image

## Testing

After adding icons, test them:
1. Run the development server
2. Open Chrome DevTools > Application > Manifest
3. Verify all icons are loading correctly
4. Test the "Add to Home Screen" functionality on mobile devices

## Current Status

**⚠️ Icons need to be added!**

The PWA is currently configured to use these icon files, but they don't exist yet. Please generate and add the icons to this directory for the PWA to work properly.

You can use the `/public/placeholder-logo.svg` or `/public/placeholder-logo.png` as a source image, or create custom CÁRIS branded icons.
