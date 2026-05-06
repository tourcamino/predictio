# Open Graph Social Media Preview Cards

This document explains how the Open Graph (OG) image generation system works for creating visual preview cards when market links are shared on social media platforms.

## Overview

When a market link is shared on social media (Twitter, Facebook, LinkedIn, Telegram, etc.), the platform's crawler visits the URL to extract metadata and preview images. Our system:

1. **Detects social media crawlers** via user agent
2. **Generates branded preview cards** with market details
3. **Serves HTML with proper meta tags** for optimal social sharing
4. **Caches images in MinIO** for fast subsequent loads

## Architecture

### Components

#### 1. Image Generation (`src/server/trpc/procedures/generateMarketOGImage.ts`)
- Uses `@napi-rs/canvas` to programmatically generate 1200x630px images
- Includes Predictio branding, team names, odds, volume, and sport-specific styling
- Caches generated images in MinIO's `og-images` bucket
- Returns public URLs that social media platforms can access

#### 2. Meta Tag Handler (`src/server/og-meta-handler.ts`)
- HTTP router that intercepts `/markets/*` requests
- Detects social media crawlers by user agent
- Serves HTML with Open Graph and Twitter Card meta tags
- Redirects regular browsers to the SPA

#### 3. Pre-generation (`src/components/OGImagePreloader.tsx`)
- Mounted on the homepage
- Pre-generates OG images for featured markets in the background
- Ensures instant preview availability when sharing popular markets

#### 4. MinIO Storage (`src/server/scripts/setup.ts`)
- Creates `og-images` bucket with public read policy
- Stores generated images with long cache headers
- Accessible at `{MINIO_BASE_URL}/og-images/market-{marketId}.png`

## How It Works

### Sharing Flow

1. **User shares a market link** (e.g., `https://predictio.io/markets/market-1`)
2. **Social media crawler visits** the URL
3. **og-meta-handler detects** the crawler and market ID
4. **Server checks MinIO** for existing OG image
5. **If not found, generates** image using canvas
6. **Returns HTML** with meta tags pointing to the image
7. **Crawler scrapes** the meta tags and image
8. **Social platform displays** the preview card

### Generated Image Content

Each preview card includes:
- **Predictio branding** (logo, colors)
- **Sport-specific styling** (emoji, accent colors)
- **League name** (e.g., "UEFA CHAMPIONS LEAGUE")
- **Team matchup** (e.g., "Real Madrid vs FC Barcelona")
- **Key statistics**:
  - Total volume (e.g., "$124K")
  - Number of predictions (e.g., "3,241")
  - Current odds (e.g., "45% / 33%")
- **Professional design** with gradients, grid patterns, and branded colors

## Meta Tags

### Open Graph Tags
```html
<meta property="og:title" content="⚽ Real Madrid vs FC Barcelona - UEFA Champions League">
<meta property="og:description" content="Predict the outcome on Predictio! 45% Real Madrid / 33% FC Barcelona...">
<meta property="og:image" content="https://minio.predictio.io/og-images/market-market-1.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://predictio.io/markets/market-1">
<meta property="og:site_name" content="Predictio">
```

### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="⚽ Real Madrid vs FC Barcelona - UEFA Champions League">
<meta name="twitter:description" content="Predict the outcome on Predictio!...">
<meta name="twitter:image" content="https://minio.predictio.io/og-images/market-market-1.png">
<meta name="twitter:site" content="@Predictio">
```

## Testing

### Testing Social Media Previews

#### Twitter/X
1. Share a market link in a tweet
2. Twitter will automatically generate a preview card
3. Or use: https://cards-dev.twitter.com/validator

#### Facebook
1. Use the Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
2. Enter your market URL
3. Click "Scrape Again" to refresh the cache

#### LinkedIn
1. Use the LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
2. Enter your market URL
3. View the preview

#### Telegram
1. Paste a market link in any chat
2. Telegram will automatically fetch and display the preview

### Testing Locally

1. **Start the development server**
```bash
npm run dev
```

2. **Generate an OG image**
```bash
curl "http://localhost:8000/trpc/generateMarketOGImage?input=%7B%22marketId%22%3A%22market-1%22%7D"
```

3. **Test crawler detection**
```bash
curl -H "User-Agent: Twitterbot/1.0" http://localhost:8000/markets/market-1
```

4. **View the generated image**
Open `http://localhost:9000/og-images/market-market-1.png` in your browser

### Debugging

#### Image Not Generating
- Check MinIO is running: `docker ps | grep minio`
- Check bucket exists: Visit MinIO console at http://localhost:9001
- Check server logs for canvas errors
- Verify `@napi-rs/canvas` is installed

#### Meta Tags Not Showing
- Verify og-meta-handler is registered in `app.config.ts`
- Check user agent detection logic
- Use curl with crawler user agent to test
- Check that market ID is being extracted correctly

#### Image URL Not Accessible
- Verify bucket policy is set to public read
- Check `MINIO_BASE_URL` environment variable
- Test direct access to MinIO: `http://localhost:9000/og-images/`

## Environment Variables

No additional environment variables are required for basic functionality. The system uses:
- `BASE_URL` - For constructing absolute URLs in meta tags
- `ADMIN_PASSWORD` - For MinIO authentication (already configured)

## Performance Considerations

### Caching Strategy
- **Generated images are cached** in MinIO indefinitely
- **Check before generate**: System checks if image exists before creating new one
- **Long cache headers**: Images served with `max-age=31536000` (1 year)

### Pre-generation
- **Featured markets** are pre-generated on homepage load
- **Staggered requests** (500ms delay) to avoid server overload
- **Silent failures** - errors don't affect user experience

### Image Size
- **Optimized dimensions**: 1200x630px (optimal for all platforms)
- **PNG format**: ~50-150KB per image
- **Minimal text**: Keeps file size small while maintaining readability

## Maintenance

### Adding New Sports
When adding new sports, update `SPORT_METADATA` in `src/data/mockMarkets.ts`:
```typescript
export const SPORT_METADATA: Record<string, SportMetadata> = {
  newsport: {
    name: 'New Sport',
    emoji: '🎯',
    color: '#FF6B35',
    bgColor: 'bg-[#FF6B35]',
  },
  // ...
};
```

### Updating Design
Edit `generateMarketCardImage()` in `src/server/trpc/procedures/generateMarketOGImage.ts`:
- Adjust colors, fonts, layout
- Add new stats or information
- Change branding elements

### Clearing Cache
To regenerate all images:
1. Delete images from MinIO: `mc rm --recursive minio/og-images/`
2. Images will be regenerated on next request

## Best Practices

1. **Always test on multiple platforms** before deploying
2. **Keep image file size under 200KB** for fast loading
3. **Use high contrast text** for readability on mobile
4. **Include key information** (teams, odds, volume)
5. **Maintain consistent branding** across all cards
6. **Monitor MinIO storage** as images accumulate

## Troubleshooting

### Common Issues

**Issue**: Images show as broken on social media
- **Solution**: Verify MinIO bucket is publicly accessible
- **Solution**: Check that BASE_URL is set correctly for production

**Issue**: Old image shows after market update
- **Solution**: Delete the cached image from MinIO
- **Solution**: Social platforms cache aggressively - use their debug tools to refresh

**Issue**: Canvas errors on server start
- **Solution**: Ensure `@napi-rs/canvas` native dependencies are installed
- **Solution**: May need to rebuild: `npm rebuild @napi-rs/canvas`

**Issue**: Crawler not detecting meta tags
- **Solution**: Verify og-meta-handler is running on correct route
- **Solution**: Check that user agent detection includes your platform
- **Solution**: Some platforms need exact user agent strings

## Future Enhancements

Potential improvements:
- [ ] Add animated GIFs for live markets
- [ ] Include QR codes for mobile sharing
- [ ] Generate sport-specific templates
- [ ] Add user prediction overlays
- [ ] Support multiple languages
- [ ] Generate video previews for premium markets
