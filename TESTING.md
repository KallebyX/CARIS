# Testing Infrastructure Documentation

## Overview

Comprehensive testing infrastructure has been set up for the CÁRIS platform using Jest, React Testing Library, and related tools. This document provides guidance on running tests, understanding the test structure, and troubleshooting common issues.

## 📁 Test Structure

```
CÁRIS/
├── __tests__/                    # Test files
│   ├── api/                      # API route tests
│   │   └── chat.test.ts
│   ├── components/               # Component tests
│   │   └── ui/
│   │       └── button.test.tsx
│   ├── lib/                      # Utility function tests
│   │   └── auth.test.ts
│   ├── services/                 # Service layer tests
│   │   └── notification.test.ts
│   └── integration/              # Integration tests
│       ├── chat-flow.test.ts
│       └── user-registration.test.ts
├── test-utils/                   # Testing utilities
│   ├── index.tsx                 # Custom render with providers
│   ├── mocks.ts                  # Mock data generators
│   ├── db-helpers.ts             # Database test helpers
│   └── api-mocks.ts              # API mocking utilities
├── jest.config.js                # Jest configuration
└── jest.setup.js                 # Global test setup and mocks
```

## 🚀 Running Tests

### Available Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run integration tests only
pnpm test:integration
```

### Running Specific Tests

```bash
# Run a specific test file
pnpm test -- __tests__/lib/auth.test.ts

# Run tests matching a pattern
pnpm test -- --testPathPattern="auth"

# Run tests with verbose output
pnpm test -- --verbose
```

## 📦 Installed Dependencies

### Testing Libraries

- **jest** (v29.7.0) - Testing framework
- **jest-environment-jsdom** (v29.7.0) - Browser-like environment for component tests
- **@swc/jest** (v0.2.36) - Fast TypeScript/JSX transformation
- **@testing-library/react** (v16.1.0) - React component testing utilities
- **@testing-library/jest-dom** (v6.6.3) - Custom Jest matchers for DOM
- **@testing-library/user-event** (v14.5.2) - User interaction simulation
- **@types/jest** (v29.5.14) - TypeScript types for Jest

### Testing Features

- In-memory PostgreSQL with PGLite for integration tests
- Mocked Next.js router, headers, and cookies
- Mocked Pusher (WebSocket) for real-time features
- Mocked database queries with Drizzle ORM
- Mocked email, SMS, and push notification services
- Custom render function with React Query provider
- Mock data generators for users, sessions, messages, etc.

## 📝 Test Examples

### 1. Unit Test Example (Auth Utilities)

Located at `/home/user/CARIS/__tests__/lib/auth.test.ts`

```typescript
it('should return userId from valid token', async () => {
  // Arrange
  const userId = 123
  const token = await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(secret)

  const request = new NextRequest('http://localhost:3000/api/test', {
    headers: { cookie: `token=${token}` },
  })

  // Act
  const result = await getUserIdFromRequest(request)

  // Assert
  expect(result).toBe(userId)
})
```

### 2. API Route Test Example (Chat API)

Located at `/home/user/CARIS/__tests__/api/chat.test.ts`

```typescript
it('should return messages for existing room', async () => {
  // Arrange
  jest.spyOn(auth, 'getUserIdFromRequest').mockResolvedValue(1)
  const request = createAuthenticatedRequest(
    'http://localhost:3000/api/chat?roomId=1',
    1
  )

  const mockRoom = { ...mockChatRoom, participantIds: JSON.stringify([1, 2]) }
  const mockMessages = [mockChatMessage]

  ;(db.select as jest.Mock)
    .mockReturnValueOnce(mockDbQueryBuilder.select([mockRoom]))
    .mockReturnValueOnce(mockDbQueryBuilder.select(mockMessages))

  // Act
  const response = await GET(request)
  const data = await parseNextResponse(response)

  // Assert
  expect(response.status).toBe(200)
  expect(data.success).toBe(true)
  expect(data.data.messages).toHaveLength(1)
})
```

### 3. Component Test Example (Button)

Located at `/home/user/CARIS/__tests__/components/ui/button.test.tsx`

```typescript
it('should call onClick handler when clicked', async () => {
  // Arrange
  const user = userEvent.setup()
  const handleClick = jest.fn()
  render(<Button onClick={handleClick}>Click me</Button>)

  // Act
  const button = screen.getByRole('button')
  await user.click(button)

  // Assert
  expect(handleClick).toHaveBeenCalledTimes(1)
})
```

### 4. Integration Test Example (User Registration)

Located at `/home/user/CARIS/__tests__/integration/user-registration.test.ts`

```typescript
it('should create a new patient account with profile', async () => {
  // Arrange
  const userData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password_here',
    role: 'patient',
  }

  // Act - Insert user
  const userResult = await testDb.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role`,
    [userData.name, userData.email, userData.password, userData.role]
  )

  // Assert
  const user = userResult.rows[0]
  expect(user.name).toBe('John Doe')
  expect(user.role).toBe('patient')
})
```

## 🔧 Configuration Files

### jest.config.js

- Configures Jest for Next.js 15
- TypeScript support with automatic transformation
- Module path aliases (`@/...`)
- Coverage thresholds (80% minimum)
- Test environment setup
- ESM module transformation

### jest.setup.js

Global test setup including:

- Jest DOM matchers
- TextEncoder/TextDecoder polyfills
- Web API polyfills (Request, Response, Headers)
- Next.js router mocks
- Pusher mocks
- Database mocks
- Email/SMS/Push notification service mocks
- React Query mocks
- IntersectionObserver and ResizeObserver mocks

## 🧪 Test Utilities

### Custom Render Function

Located at `/home/user/CARIS/test-utils/index.tsx`

```typescript
import { render } from '@/test-utils'

// Automatically wraps components with QueryClientProvider
render(<MyComponent />)
```

### Mock Data Generators

Located at `/home/user/CARIS/test-utils/mocks.ts`

```typescript
import { mockUser, mockChatMessage, generateMockToken } from '@/test-utils/mocks'

// Use pre-defined mock data
const patient = mockUser.patient
const psychologist = mockUser.psychologist

// Generate mock JWT token
const token = generateMockToken(userId)
```

### API Mock Utilities

Located at `/home/user/CARIS/test-utils/api-mocks.ts`

```typescript
import {
  createAuthenticatedRequest,
  parseNextResponse,
  mockDbQueryBuilder,
} from '@/test-utils/api-mocks'

// Create authenticated API request
const request = createAuthenticatedRequest('http://localhost/api/test', userId)

// Parse API response
const data = await parseNextResponse(response)
```

### Database Test Helpers

Located at `/home/user/CARIS/test-utils/db-helpers.ts`

```typescript
import { setupTestDatabase, teardownTestDatabase } from '@/test-utils/db-helpers'

beforeAll(async () => {
  testDb = await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})
```

## ⚙️ Coverage Configuration

The project is configured with the following coverage thresholds:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

To view coverage report:

```bash
pnpm test:coverage
```

Coverage reports are generated in the `coverage/` directory (excluded from git).

## 🐛 Known Issues & Solutions

### Issue 1: ESM Module Transformation (jose library)

**Problem**: The `jose` library uses ESM syntax which Jest doesn't transform by default.

**Status**: Configuration added to transform jose module, but may need additional setup.

**Temporary Solution**:
- Tests using `jose` directly may fail
- Consider mocking JWT operations in tests that don't specifically test auth

### Issue 2: PGLite Integration Tests

**Problem**: PGLite requires `--experimental-vm-modules` flag for Node.js.

**Solution**: Add to test command for integration tests:

```bash
node --experimental-vm-modules node_modules/.bin/jest __tests__/integration
```

### Issue 3: React Query with React 19

**Problem**: React Query's `client.mount()` method compatibility issue with React 19.

**Status**: This is a known compatibility issue between React Query and React 19.

**Temporary Solution**:
- Component tests using QueryClient may fail
- Consider testing components without QueryClient wrapper for now
- Update React Query when compatible version is released

### Issue 4: Mock Service Issues

**Problem**: Some service mocks may not be properly initialized.

**Solution**: Ensure mocks are properly set up in `jest.setup.js` and individual test files.

## 📊 Test Best Practices

### 1. Follow AAA Pattern

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const mockData = { ... }

  // Act - Execute the code under test
  const result = await functionUnderTest(mockData)

  // Assert - Verify the results
  expect(result).toBe(expectedValue)
})
```

### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => { ... })

// ✅ Good
it('should return 401 when user is not authenticated', () => { ... })
```

### 3. Test One Thing Per Test

```typescript
// ❌ Bad - testing multiple things
it('handles user actions', () => {
  expect(login()).toBe(true)
  expect(logout()).toBe(true)
  expect(register()).toBe(true)
})

// ✅ Good - separate tests
it('should login successfully', () => { ... })
it('should logout successfully', () => { ... })
it('should register new user', () => { ... })
```

### 4. Clean Up After Tests

```typescript
afterEach(() => {
  jest.clearAllMocks()
})

afterAll(async () => {
  await cleanupResources()
})
```

### 5. Use Test Utilities

```typescript
// ✅ Use custom utilities
import { mockUser, createAuthenticatedRequest } from '@/test-utils/mocks'

// Instead of manually creating mock data every time
```

## 🔍 Debugging Tests

### Run Single Test File

```bash
pnpm test -- path/to/test.ts
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Debug with VSCode

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/jest)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎯 Next Steps

To fully enable all tests:

1. **Resolve ESM Module Issues**:
   - Configure Jest to properly handle ESM modules
   - Consider alternative JWT libraries or custom mocking strategy

2. **Fix Integration Tests**:
   - Update test scripts to include `--experimental-vm-modules`
   - Or use alternative in-memory database solution

3. **Update React Query**:
   - Monitor React Query releases for React 19 compatibility
   - Update when stable version is available

4. **Expand Test Coverage**:
   - Add tests for remaining API routes
   - Add tests for complex business logic
   - Add tests for critical user flows
   - Add accessibility tests with jest-axe

5. **Set Up CI/CD**:
   - Configure GitHub Actions or similar for automated testing
   - Add pre-commit hooks with Husky
   - Enforce coverage thresholds in CI

## 📞 Support

For questions or issues with the testing infrastructure, please:

1. Check this documentation
2. Review existing test examples
3. Consult Jest and React Testing Library documentation
4. Create an issue in the project repository

---

**Last Updated**: 2025-11-12
**Testing Framework**: Jest 29.7.0
**Next.js Version**: 15.4.7
**React Version**: 19.0.0
