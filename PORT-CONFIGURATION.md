# Port Configuration: 8080

## Summary
The Family Gallery application has been configured to run on **port 8080** instead of the default Next.js port 3000.

## What Changed

### ✅ Updated Configuration
- **Package.json**: `yarn dev` now starts server on port 8080
- **Playwright Tests**: All E2E tests now target `http://localhost:8080`
- **API Tests**: All test endpoints updated to use port 8080
- **Authentication Setup**: Mock states use port 8080 origin
- **Documentation**: All references updated across docs

### 📁 Files Modified
1. `package.json` - Dev script: `yarn dev -p 8080`
2. `playwright.config.ts` - Base URL and web server URL
3. `tests/e2e/auth.setup.ts` - Mock authentication origins
4. `tests/e2e/global-setup.ts` - Base URL reference
5. `tests/api/upload-endpoints.test.ts` - All API endpoint URLs
6. `tests/e2e/README.md` - Documentation updates
7. `docs/r2-cors-setup.md` - CORS configuration examples
8. `README.md` - Port information
9. `DEVELOPMENT.md` - Local development URLs
10. `docs/family-gallery-project-plan-v40.md` - Project documentation

## Running the Application

### Development Server
```bash
yarn dev  # Starts on http://localhost:8080
```

### Manual Port Override
If needed, you can still override the port:
```bash
yarn next dev -p 3000  # Use port 3000
yarn next dev -p 9000  # Use port 9000
```

## Testing

### E2E Tests
All E2E tests are configured for port 8080:
```bash
yarn test:e2e  # Tests against http://localhost:8080
```

### Custom Base URL
Override for testing against different port:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 yarn test:e2e
```

## CORS Configuration

### R2 Bucket CORS
Update your R2 bucket CORS to include:
```json
{
  "AllowedOrigins": [
    "http://localhost:8080",
    "http://localhost:3001",
    "https://*.vercel.app",
    "https://your-domain.com"
  ]
}
```

### Clerk Application URLs
Update your Clerk application settings:
- Add `http://localhost:8080` to allowed origins
- Update redirect URLs if using OAuth

## Why Port 8080?

Port 8080 is commonly used for:
- ✅ Web development servers
- ✅ Alternative HTTP port
- ✅ Less likely to conflict with other services
- ✅ Standard in many enterprise environments

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 8080
lsof -i :8080

# Kill process if needed
kill -9 <PID>

# Or use different port
yarn next dev -p 3000
```

### Tests Failing
Ensure your dev server is running on 8080:
```bash
# Terminal 1
yarn dev  # Should show "ready on http://localhost:8080"

# Terminal 2  
yarn test:e2e
```

---

**Note**: This change ensures the application never conflicts with other services that commonly use port 3000, and provides a consistent development environment across all team members. 