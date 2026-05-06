# Error Monitoring System

**Last Updated:** 2025-01-29  
**Status:** Production Ready ✅

---

## Overview

Predictio.live includes a comprehensive error monitoring system that captures, tracks, and reports errors across the entire application. The system is designed to work in development for debugging and in production with external monitoring services like Sentry.

---

## Features

### Automatic Error Capture
- ✅ Unhandled JavaScript errors
- ✅ Unhandled promise rejections
- ✅ React component errors (via ErrorBoundary)
- ✅ tRPC API call failures
- ✅ HTTP request failures (status >= 500)

### Context Tracking
- ✅ User identification (wallet address)
- ✅ Breadcrumb trail (last 50 actions)
- ✅ Custom tags and metadata
- ✅ Environment information
- ✅ Browser and device info

### Performance Monitoring
- ✅ Transaction timing
- ✅ API request duration
- ✅ Page load metrics

### Integration Ready
- ✅ Sentry-compatible architecture
- ✅ LogRocket-compatible
- ✅ Custom logging services
- ✅ Server-side forwarding

---

## Architecture

### Client-Side (`src/lib/errorMonitoring.ts`)

The error monitoring system is implemented as a singleton class that initializes automatically when imported:

```typescript
import { errorMonitor } from '~/lib/errorMonitoring';

// Automatically initialized on import
errorMonitor.init();
```

### Server-Side (`src/server/debug/client-logs-handler.ts`)

Client errors are forwarded to the server for centralized logging:

```typescript
POST /api/debug/client-logs
{
  "logs": [{
    "level": "error",
    "message": "Error message",
    "timestamp": "2025-01-29T...",
    "stacks": ["Error stack trace"],
    "extra": { /* context */ }
  }]
}
```

---

## Usage

### Basic Error Capture

```typescript
import { captureException } from '~/lib/errorMonitoring';

try {
  // Risky operation
  await placeTrade(marketId, amount);
} catch (error) {
  captureException(error, {
    tags: { feature: 'trading', market: marketId },
    extra: { amount, userId },
    level: 'error',
  });
  throw error; // Re-throw if needed
}
```

### Capture Messages (Non-Errors)

```typescript
import { captureMessage } from '~/lib/errorMonitoring';

captureMessage('User reached payout threshold', {
  level: 'info',
  tags: { feature: 'payouts' },
  extra: { walletAddress, amount: 10.50 },
});
```

### Track User Actions

```typescript
import { trackAction } from '~/lib/errorMonitoring';

trackAction('Place Trade', {
  marketId,
  outcome: 'YES',
  amount: 100,
  slippage: 0.02,
});
```

### Track HTTP Requests

```typescript
import { trackRequest } from '~/lib/errorMonitoring';

const response = await fetch('/api/markets');
trackRequest('/api/markets', 'GET', response.status);
```

### Performance Monitoring

```typescript
import { startTransaction } from '~/lib/errorMonitoring';

const transaction = startTransaction('Load Portfolio', 'http.request');
try {
  await loadPortfolioData();
} finally {
  transaction.finish(); // Automatically logs duration
}
```

### Set User Context

```typescript
import { setUser } from '~/lib/errorMonitoring';

// When user connects wallet
setUser({
  wallet: '0x1234...',
  isAnalyst: true,
  isAdmin: false,
});

// When user disconnects
setUser(undefined);
```

---

## Integration with React

### Error Boundary

The root component includes an ErrorBoundary that automatically captures React errors:

```typescript
// src/routes/__root.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureException(error, {
      tags: { type: 'react-error-boundary' },
      extra: { errorInfo },
      level: 'error',
    });
  }
  // ...
}
```

### tRPC Integration

All tRPC calls are automatically monitored via a custom link:

```typescript
// src/trpc/react.tsx
{
  type: 'link',
  fn: () => ({ op, next }) => {
    return next(op).pipe((result) => {
      trackRequest(`/trpc/${op.path}`, op.type.toUpperCase(), 
        result.ok ? 200 : 500);
      
      if (!result.ok) {
        captureException(result.error, {
          tags: { type: 'trpc-error', procedure: op.path },
          extra: { input: op.input },
        });
      }
      return result;
    });
  },
}
```

---

## Configuration

### Environment Variables

```bash
# Optional - for Sentry or similar services
VITE_ERROR_MONITORING_DSN=https://...@sentry.io/...
VITE_ERROR_MONITORING_ENVIRONMENT=production
VITE_APP_VERSION=1.0.0

# Server-side (optional)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production
```

### Development vs Production

The system behaves differently based on environment:

**Development:**
- Logs all errors to console
- Captures 100% of errors
- Detailed stack traces
- Breadcrumbs visible in console

**Production:**
- Silent console logging
- Sends to external service (if configured)
- Sample rate configurable (default 100%)
- Performance transactions sampled at 10%

---

## Integrating with Sentry

### Step 1: Install Sentry SDK

```bash
npm install @sentry/react @sentry/tracing
```

### Step 2: Initialize Sentry

```typescript
// src/lib/errorMonitoring.ts
import * as Sentry from '@sentry/react';

if (this.config.dsn && this.config.environment === 'production') {
  Sentry.init({
    dsn: this.config.dsn,
    environment: this.config.environment,
    release: this.config.release,
    tracesSampleRate: this.config.tracesSampleRate,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
  });
}
```

### Step 3: Update captureException

```typescript
captureException(error: Error | unknown, context?: ErrorContext) {
  // ... existing code ...

  // Send to Sentry
  if (this.config.dsn && typeof Sentry !== 'undefined') {
    Sentry.captureException(errorObj, {
      tags: errorData.tags,
      extra: errorData.extra,
      user: this.userContext,
      level: errorData.level,
    });
  }
}
```

### Step 4: Set DSN

```bash
# .env
VITE_ERROR_MONITORING_DSN=https://your-dsn@sentry.io/project-id
VITE_ERROR_MONITORING_ENVIRONMENT=production
```

---

## Integrating with LogRocket

### Step 1: Install LogRocket

```bash
npm install logrocket
```

### Step 2: Initialize LogRocket

```typescript
// src/lib/errorMonitoring.ts
import LogRocket from 'logrocket';

if (this.config.environment === 'production') {
  LogRocket.init('your-app-id/project-name');
}
```

### Step 3: Identify Users

```typescript
setUser(user: ErrorContext['user']) {
  this.userContext = user;
  
  if (user?.wallet && typeof LogRocket !== 'undefined') {
    LogRocket.identify(user.wallet, {
      isAnalyst: user.isAnalyst,
      isAdmin: user.isAdmin,
    });
  }
}
```

---

## Breadcrumbs

Breadcrumbs provide a trail of events leading up to an error:

### Automatic Breadcrumbs

- Navigation (page loads)
- User actions (tracked via trackAction)
- HTTP requests (tracked via trackRequest)
- tRPC calls (automatic)

### Manual Breadcrumbs

```typescript
import { errorMonitor } from '~/lib/errorMonitoring';

errorMonitor.addBreadcrumb({
  type: 'user',
  category: 'trading',
  message: 'User adjusted slippage tolerance',
  data: { newValue: 0.05 },
  timestamp: Date.now(),
  level: 'info',
});
```

---

## Best Practices

### 1. Always Add Context

```typescript
// ❌ Bad
captureException(error);

// ✅ Good
captureException(error, {
  tags: { feature: 'trading', market: marketId },
  extra: { amount, userId, timestamp },
  level: 'error',
});
```

### 2. Use Appropriate Levels

- `fatal`: System-critical errors (payment processing, data loss)
- `error`: User-facing errors (trade failed, login failed)
- `warning`: Recoverable issues (slow API, deprecated feature)
- `info`: Important events (payout threshold reached)
- `debug`: Detailed debugging info

### 3. Track User Actions

```typescript
// Track important user interactions
trackAction('Connect Wallet', { method: 'MetaMask' });
trackAction('Place Trade', { marketId, amount });
trackAction('Become Analyst', { refCode });
```

### 4. Don't Capture Sensitive Data

```typescript
// ❌ Bad - includes private key
captureException(error, {
  extra: { privateKey, password }
});

// ✅ Good - only non-sensitive data
captureException(error, {
  extra: { walletAddress, marketId }
});
```

### 5. Use Transactions for Performance

```typescript
const transaction = startTransaction('Load Markets', 'http.request');
try {
  const markets = await fetchMarkets();
  // ... process markets
} finally {
  transaction.finish();
}
```

---

## Monitoring Dashboard

Once integrated with Sentry or similar service, you can:

1. **View Error Trends**
   - Errors over time
   - Most common errors
   - Error rate by feature

2. **Analyze User Impact**
   - How many users affected
   - Which wallets experiencing issues
   - Geographic distribution

3. **Debug with Context**
   - Full stack traces
   - Breadcrumb trail
   - User context
   - Device/browser info

4. **Set Up Alerts**
   - Email when error rate spikes
   - Slack notifications for critical errors
   - PagerDuty integration for on-call

5. **Track Performance**
   - Slow API calls
   - Page load times
   - Transaction durations

---

## Troubleshooting

### Errors Not Being Captured

1. Check that error monitoring is initialized:
   ```typescript
   import { errorMonitor } from '~/lib/errorMonitoring';
   console.log(errorMonitor); // Should be initialized
   ```

2. Verify environment variables are set:
   ```bash
   echo $VITE_ERROR_MONITORING_DSN
   ```

3. Check browser console for initialization logs:
   ```
   [ErrorMonitor] Initialized { environment: 'production', ... }
   ```

### Breadcrumbs Not Appearing

1. Ensure breadcrumbs are being added:
   ```typescript
   import { errorMonitor } from '~/lib/errorMonitoring';
   console.log(errorMonitor.getBreadcrumbs());
   ```

2. Check max breadcrumbs limit (default 50)

### Performance Impact

The error monitoring system is designed to be lightweight:

- Breadcrumbs stored in memory (max 50)
- Errors sent asynchronously
- No blocking operations
- Minimal overhead (<1ms per operation)

If you notice performance issues:

1. Reduce sample rate:
   ```typescript
   sampleRate: 0.5, // Capture 50% of errors
   ```

2. Reduce trace sample rate:
   ```typescript
   tracesSampleRate: 0.05, // Capture 5% of transactions
   ```

---

## Testing

### Manual Testing

```typescript
// Test error capture
import { captureException } from '~/lib/errorMonitoring';
captureException(new Error('Test error'));

// Test message capture
import { captureMessage } from '~/lib/errorMonitoring';
captureMessage('Test message', { level: 'info' });

// Check breadcrumbs
import { errorMonitor } from '~/lib/errorMonitoring';
console.log(errorMonitor.getBreadcrumbs());
```

### Automated Testing

```typescript
// In tests, disable error monitoring
import { errorMonitor } from '~/lib/errorMonitoring';
errorMonitor.config.enabled = false;
```

---

## Future Enhancements

- [ ] Session replay integration
- [ ] Source map upload automation
- [ ] Custom error grouping rules
- [ ] Release tracking
- [ ] User feedback widget
- [ ] Performance budgets
- [ ] Real user monitoring (RUM)

---

**Built with ⚡ by Predictio Team**
