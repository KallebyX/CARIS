# API Documentation Installation Guide

This guide walks you through setting up the comprehensive API documentation for the CÁRIS platform.

---

## What Was Created

### 1. **API Documentation Generator** (`/lib/api-docs-generator.ts`)
   - Type-safe OpenAPI specification generation
   - Schema extraction from TypeScript types
   - Zod schema to JSON Schema conversion
   - Reusable component schemas

### 2. **OpenAPI Specification** (`/openapi.json`)
   - Complete OpenAPI 3.0 specification
   - All major API endpoints documented
   - Request/response schemas
   - Authentication flows
   - Error responses

### 3. **Type-Safe API Client** (`/lib/api-client.ts`)
   - Full TypeScript API client
   - Automatic authentication handling
   - Error handling with custom ApiError class
   - Methods for all endpoints
   - Request/response types

### 4. **Interactive API Documentation Page** (`/app/api-docs/page.tsx`)
   - Swagger UI integration
   - Try-it-out functionality
   - Quick start guide
   - Code examples in multiple languages
   - Tabbed interface

### 5. **Comprehensive Documentation Files** (`/docs/`)
   - **API_REFERENCE.md** - Complete endpoint reference
   - **API_AUTHENTICATION.md** - Auth guide with examples
   - **API_EXAMPLES.md** - Real-world code examples
   - **API_ERRORS.md** - Error handling guide
   - **API_RATE_LIMITS.md** - Rate limiting documentation
   - **README.md** - Documentation overview

---

## Installation Steps

### Step 1: Install Required Dependencies

The API documentation page requires Swagger UI React:

```bash
# Using npm
npm install swagger-ui-react

# Using pnpm
pnpm add swagger-ui-react

# Using yarn
yarn add swagger-ui-react
```

### Step 2: Copy OpenAPI Spec to Public Directory

The OpenAPI specification needs to be accessible publicly:

```bash
# Make sure the openapi.json is in the root directory
# It's already created at /home/user/CARIS/openapi.json

# For Next.js, you can also copy it to public directory if needed
cp openapi.json public/openapi.json
```

### Step 3: Verify File Structure

Ensure all files are in place:

```
/home/user/CARIS/
├── openapi.json                    # OpenAPI 3.0 specification
├── lib/
│   ├── api-client.ts              # Type-safe API client
│   └── api-docs-generator.ts      # Documentation generator
├── app/
│   └── api-docs/
│       └── page.tsx               # Interactive docs page
└── docs/
    ├── README.md                  # Documentation index
    ├── API_REFERENCE.md           # Endpoint reference
    ├── API_AUTHENTICATION.md      # Auth guide
    ├── API_EXAMPLES.md            # Code examples
    ├── API_ERRORS.md              # Error handling
    └── API_RATE_LIMITS.md         # Rate limits
```

### Step 4: Start the Development Server

```bash
pnpm dev
```

### Step 5: Access the Documentation

Open your browser and navigate to:

- **Interactive Docs**: http://localhost:3000/api-docs
- **OpenAPI Spec**: http://localhost:3000/openapi.json
- **Markdown Docs**: See `/docs` folder

---

## Usage

### Using the Type-Safe API Client

```typescript
import { apiClient } from '@/lib/api-client'

// Login
const response = await apiClient.auth.login(
  'user@example.com',
  'password123'
)

// Create diary entry
const entry = await apiClient.diary.createEntry({
  moodRating: 3,
  intensityRating: 7,
  content: 'Today was a good day...',
  cycle: 'crescer'
})

// Get chat messages
const messages = await apiClient.chat.getMessages({
  otherUserId: 2
})
```

### Error Handling

```typescript
import { apiClient, ApiError } from '@/lib/api-client'

try {
  const user = await apiClient.user.me()
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Status:', error.statusCode)
    console.error('Message:', error.message)
    console.error('Data:', error.data)

    if (error.statusCode === 401) {
      // Redirect to login
      router.push('/login')
    }
  }
}
```

---

## Features

### Interactive API Documentation

The `/api-docs` page provides:

- **API Reference Tab**: Swagger UI with all endpoints
- **Quick Start Tab**: Getting started guide
- **Code Examples Tab**: Examples in TypeScript, JavaScript, Python, and cURL
- **Try It Out**: Test API calls directly from the browser
- **Download Spec**: Download OpenAPI spec button

### Type-Safe API Client

Benefits:
- ✓ Full TypeScript support with IntelliSense
- ✓ Automatic authentication handling
- ✓ Consistent error handling
- ✓ Request/response type safety
- ✓ No manual endpoint URLs
- ✓ Built-in retry logic support

### Comprehensive Documentation

The markdown documentation includes:
- Complete endpoint reference with examples
- Authentication flows and security best practices
- Real-world code examples
- Error handling strategies
- Rate limiting details and best practices
- Troubleshooting guides

---

## Customization

### Adding New Endpoints

1. **Add to OpenAPI Spec** (`openapi.json`):

```json
{
  "paths": {
    "/your-endpoint": {
      "get": {
        "summary": "Your endpoint summary",
        "tags": ["YourTag"],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

2. **Add to API Client** (`lib/api-client.ts`):

```typescript
export class ApiClient {
  // ... existing code ...

  yourFeature = {
    getItems: async () => {
      return this.fetch<ApiResponse>('/your-endpoint')
    },

    createItem: async (data: any) => {
      return this.fetch<ApiResponse>('/your-endpoint', {
        method: 'POST',
        body: JSON.stringify(data)
      })
    }
  }
}
```

3. **Update Documentation** (`docs/API_REFERENCE.md`):

Add endpoint details, request/response examples, and usage notes.

---

### Regenerating OpenAPI Spec

To regenerate the OpenAPI specification from code:

```typescript
import { ApiDocsGenerator, CommonSchemas } from '@/lib/api-docs-generator'

const generator = new ApiDocsGenerator()

// Register schemas
Object.entries(CommonSchemas).forEach(([name, schema]) => {
  generator.registerSchema(name, schema)
})

// Register endpoints
generator.registerEndpoint({
  path: '/api/your-endpoint',
  method: 'GET',
  summary: 'Get items',
  description: 'Retrieve a list of items',
  tags: ['Your Feature'],
  auth: true,
  responses: {
    '200': {
      description: 'Success',
      schema: { $ref: '#/components/schemas/YourSchema' }
    }
  }
})

// Generate spec
const spec = generator.generateOpenApiSpec()
console.log(JSON.stringify(spec, null, 2))
```

---

## Deployment

### Production Deployment

When deploying to production:

1. **Ensure OpenAPI spec is accessible**:
   - Copy `openapi.json` to `public/` directory
   - Or serve it from the root

2. **Update base URLs** in `openapi.json`:
   ```json
   {
     "servers": [
       {
         "url": "https://app.caris.health/api",
         "description": "Production server"
       }
     ]
   }
   ```

3. **Build the application**:
   ```bash
   pnpm build
   ```

4. **Test the docs page**:
   - Visit: https://your-domain.com/api-docs
   - Verify all endpoints load correctly
   - Test authentication flow

---

## Maintenance

### Keeping Documentation in Sync

1. **After adding new endpoints**:
   - Update `openapi.json`
   - Add methods to `api-client.ts`
   - Update `API_REFERENCE.md`
   - Add examples to `API_EXAMPLES.md`

2. **After changing authentication**:
   - Update `API_AUTHENTICATION.md`
   - Update security schemes in `openapi.json`
   - Update examples

3. **After modifying error responses**:
   - Update `API_ERRORS.md`
   - Update error schemas in `openapi.json`

4. **After changing rate limits**:
   - Update `API_RATE_LIMITS.md`
   - Update rate limit annotations in `openapi.json`

---

## Testing

### Test the API Client

```typescript
// test/api-client.test.ts
import { apiClient } from '@/lib/api-client'

describe('API Client', () => {
  it('should login successfully', async () => {
    const response = await apiClient.auth.login(
      'test@example.com',
      'password'
    )
    expect(response.user).toBeDefined()
    expect(response.user.email).toBe('test@example.com')
  })

  it('should handle errors correctly', async () => {
    try {
      await apiClient.auth.login('invalid', 'invalid')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.statusCode).toBe(401)
    }
  })
})
```

### Test the Documentation Page

1. Visit http://localhost:3000/api-docs
2. Verify Swagger UI loads correctly
3. Try the "Try it out" feature on a public endpoint
4. Check code examples in different languages
5. Verify OpenAPI spec downloads correctly

---

## Troubleshooting

### Swagger UI Not Loading

**Issue**: Blank page at `/api-docs`

**Solution**:
```bash
# Install swagger-ui-react if not installed
pnpm add swagger-ui-react

# Check browser console for errors
# Ensure openapi.json is accessible at /openapi.json
```

### OpenAPI Spec Not Found

**Issue**: 404 when accessing `/openapi.json`

**Solution**:
```bash
# Copy to public directory
cp openapi.json public/openapi.json

# Or update fetch URL in page.tsx
fetch('/openapi.json') // or fetch('/api/openapi')
```

### Type Errors in API Client

**Issue**: TypeScript errors when using the API client

**Solution**:
```bash
# Ensure types are properly exported
# Check that all interfaces are defined in api-client.ts
# Run TypeScript compiler to check for errors
pnpm tsc --noEmit
```

### Authentication Errors

**Issue**: 401 Unauthorized when testing endpoints

**Solution**:
- Ensure you're logged in
- Check that cookies are being sent (`credentials: 'include'`)
- Verify JWT token is valid
- Check token expiration (7 days)

---

## Support

For issues, questions, or contributions:

- **Email**: support@caris.health
- **Documentation Issues**: Create an issue on GitHub
- **API Bugs**: Report via support email

---

## License

This documentation and API client are proprietary to CÁRIS SaaS Pro.

© 2024 CÁRIS. All rights reserved.
