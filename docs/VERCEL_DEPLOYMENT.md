# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add Vercel configuration"
   git push
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**: Click "Deploy" and wait for build to complete

### Option 2: Deploy via CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will ask configuration questions)
vercel

# Deploy to production
vercel --prod
```

## Post-Deployment Verification

### 1. Check Headers
Open browser DevTools → Network tab → Reload page → Check response headers:
- ✅ `Cross-Origin-Opener-Policy: same-origin`
- ✅ `Cross-Origin-Embedder-Policy: require-corp`

### 2. Verify SharedArrayBuffer
Open browser console and run:
```javascript
console.log(typeof SharedArrayBuffer !== 'undefined' ? '✅ SharedArrayBuffer available' : '❌ SharedArrayBuffer NOT available');
```

### 3. Test Core Features
- ✅ App loads without errors
- ✅ Model download starts (check network tab for HuggingFace requests)
- ✅ Can create a note
- ✅ Can search notes
- ✅ Service worker registers successfully

## Troubleshooting

### Issue: "SharedArrayBuffer is not defined"

**Cause**: Headers not being sent correctly

**Solutions**:
1. Check `vercel.json` is in the root directory
2. Verify headers in Network tab (see above)
3. Try redeploying: `vercel --prod --force`
4. If headers still not working, the `coi-serviceworker.js` fallback should activate automatically

### Issue: Service Worker Not Registering

**Cause**: HTTPS required for service workers

**Solution**: Vercel automatically provides HTTPS, but ensure you're accessing via `https://` not `http://`

### Issue: Models Not Loading

**Cause**: CORS or network issues

**Solutions**:
1. Check browser console for errors
2. Verify HuggingFace CDN is accessible
3. Check if service worker is caching requests (DevTools → Application → Service Workers)

### Issue: 404 on Refresh

**Cause**: SPA routing not configured

**Solution**: The `vercel.json` rewrites should handle this. If not working:
1. Verify `vercel.json` has the rewrites section
2. Redeploy with `vercel --prod --force`

## Performance Optimization

### 1. Enable Edge Caching
Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Monitor Bundle Size
```bash
npm run build
# Check dist/ folder size
du -sh dist/
```

### 3. Lighthouse Audit
Run Lighthouse in Chrome DevTools to check:
- Performance
- Accessibility
- Best Practices
- SEO

## Environment Variables (Optional)

If you need environment variables:

1. **Vercel Dashboard**: Project Settings → Environment Variables
2. **CLI**: Create `.env.production` (don't commit to git)

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate

## Continuous Deployment

Once connected to GitHub:
- ✅ Every push to `main` → Production deployment
- ✅ Every PR → Preview deployment
- ✅ Automatic rollbacks if deployment fails

## Cost Considerations

**Vercel Free Tier** includes:
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments

**Your App Characteristics**:
- ~377MB model downloads (counted as bandwidth)
- Static SPA (no serverless functions)
- Client-side only (no server costs)

**Estimate**: 
- 100GB / 377MB ≈ **265 full app loads per month** on free tier
- After first load, models cached by service worker (no bandwidth)
- **Realistic usage**: Thousands of users/month (due to caching)

## Monitoring

### Vercel Analytics (Optional)
```bash
npm i @vercel/analytics
```

Add to `src/main.tsx`:
```typescript
import { inject } from '@vercel/analytics';
inject();
```

### Check Deployment Logs
```bash
vercel logs <deployment-url>
```

## Rollback

If deployment has issues:
```bash
# List deployments
vercel ls

# Promote a previous deployment to production
vercel promote <deployment-url>
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [SharedArrayBuffer Requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)
