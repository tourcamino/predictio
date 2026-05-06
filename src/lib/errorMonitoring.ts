/**
 * Error Monitoring System
 * 
 * This module provides comprehensive error tracking and monitoring for both
 * client and server-side errors. It's designed to work with external services
 * like Sentry, LogRocket, or custom logging solutions.
 * 
 * Features:
 * - Automatic error capture
 * - User context tracking
 * - Breadcrumb trail
 * - Performance monitoring
 * - Custom error tags
 * - Source map support
 */

interface ErrorContext {
  user?: {
    wallet?: string;
    isAnalyst?: boolean;
    isAdmin?: boolean;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

interface Breadcrumb {
  type: 'navigation' | 'user' | 'http' | 'error' | 'info';
  category: string;
  message: string;
  data?: Record<string, any>;
  timestamp: number;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

class ErrorMonitor {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private isInitialized = false;
  private userContext: ErrorContext['user'] = {};
  private globalTags: Record<string, string> = {};
  
  // Configuration
  private config = {
    enabled: true,
    environment: import.meta.env.MODE || 'development',
    release: import.meta.env.VITE_APP_VERSION || 'dev',
    // In production, set this to your Sentry DSN or other service URL
    dsn: import.meta.env.VITE_ERROR_MONITORING_DSN || '',
    sampleRate: 1.0, // Capture 100% of errors
    tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initialize error monitoring
   */
  init() {
    if (this.isInitialized) return;

    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(event.reason, {
          tags: { type: 'unhandled-promise' },
          level: 'error',
        });
      });

      // Capture global errors
      window.addEventListener('error', (event) => {
        this.captureException(event.error, {
          tags: { 
            type: 'global-error',
            filename: event.filename,
            lineno: String(event.lineno),
            colno: String(event.colno),
          },
          level: 'error',
        });
      });

      // Track navigation
      this.addBreadcrumb({
        type: 'navigation',
        category: 'navigation',
        message: `Page loaded: ${window.location.pathname}`,
        timestamp: Date.now(),
      });
    }

    // Set global tags
    this.globalTags = {
      environment: this.config.environment,
      release: this.config.release,
    };

    this.isInitialized = true;
    console.log('[ErrorMonitor] Initialized', this.config);
  }

  /**
   * Set user context for error reports
   */
  setUser(user: ErrorContext['user']) {
    this.userContext = user;
    this.addBreadcrumb({
      type: 'user',
      category: 'auth',
      message: user?.wallet ? `User identified: ${user.wallet}` : 'User logged out',
      timestamp: Date.now(),
    });
  }

  /**
   * Add a breadcrumb (trail of events leading to error)
   */
  addBreadcrumb(breadcrumb: Breadcrumb) {
    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Capture an exception with context
   */
  captureException(error: unknown, context?: ErrorContext) {
    if (!this.config.enabled) return;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    const errorData = {
      message: errorObj.message,
      stack: errorObj.stack,
      name: errorObj.name,
      timestamp: Date.now(),
      environment: this.config.environment,
      release: this.config.release,
      user: this.userContext,
      breadcrumbs: this.breadcrumbs,
      tags: {
        ...this.globalTags,
        ...context?.tags,
      },
      extra: {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        ...context?.extra,
      },
      level: context?.level || 'error',
    };

    // Log to console in development
    if (this.config.environment === 'development') {
      console.error('[ErrorMonitor] Captured exception:', errorData);
    }

    // Send to server
    this.sendToServer(errorData);

    // In production, this would also send to Sentry or other service
    // Example Sentry integration:
    // if (this.config.dsn && typeof Sentry !== 'undefined') {
    //   Sentry.captureException(errorObj, {
    //     tags: errorData.tags,
    //     extra: errorData.extra,
    //     user: this.userContext,
    //     level: errorData.level,
    //   });
    // }
  }

  /**
   * Capture a message (non-error event)
   */
  captureMessage(message: string, context?: ErrorContext) {
    if (!this.config.enabled) return;

    const messageData = {
      message,
      timestamp: Date.now(),
      environment: this.config.environment,
      release: this.config.release,
      user: this.userContext,
      breadcrumbs: this.breadcrumbs,
      tags: {
        ...this.globalTags,
        ...context?.tags,
      },
      extra: context?.extra,
      level: context?.level || 'info',
    };

    // Log to console in development
    if (this.config.environment === 'development') {
      console.log('[ErrorMonitor] Captured message:', messageData);
    }

    // Send to server
    this.sendToServer(messageData);
  }

  /**
   * Track a transaction (for performance monitoring)
   */
  startTransaction(name: string, operation: string) {
    const startTime = Date.now();
    
    this.addBreadcrumb({
      type: 'info',
      category: 'performance',
      message: `Transaction started: ${name}`,
      data: { operation },
      timestamp: startTime,
    });

    return {
      finish: () => {
        const duration = Date.now() - startTime;
        
        this.addBreadcrumb({
          type: 'info',
          category: 'performance',
          message: `Transaction finished: ${name}`,
          data: { operation, duration },
          timestamp: Date.now(),
        });

        // In production, send to monitoring service
        if (this.config.environment === 'production') {
          this.captureMessage(`Transaction: ${name}`, {
            level: 'info',
            tags: { operation, type: 'performance' },
            extra: { duration },
          });
        }
      },
    };
  }

  /**
   * Send error data to server
   */
  private async sendToServer(data: any) {
    if (typeof window === 'undefined') return;

    try {
      await fetch('/api/debug/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [{
            level: data.level || 'error',
            message: data.message,
            timestamp: new Date(data.timestamp),
            url: data.extra?.url,
            userAgent: data.extra?.userAgent,
            stacks: data.stack ? [data.stack] : [],
            extra: {
              ...data.extra,
              user: data.user,
              tags: data.tags,
              breadcrumbs: data.breadcrumbs,
            },
          }],
        }),
      });
    } catch (error) {
      // Fail silently to avoid infinite error loops
      console.error('[ErrorMonitor] Failed to send to server:', error);
    }
  }

  /**
   * Track HTTP request
   */
  trackRequest(url: string, method: string, status?: number) {
    this.addBreadcrumb({
      type: 'http',
      category: 'fetch',
      message: `${method} ${url}`,
      data: { status },
      timestamp: Date.now(),
      level: status && status >= 400 ? 'error' : 'info',
    });

    // Capture failed requests as errors
    if (status && status >= 500) {
      this.captureMessage(`HTTP ${status} error: ${method} ${url}`, {
        level: 'error',
        tags: { type: 'http-error', status: String(status) },
        extra: { url, method },
      });
    }
  }

  /**
   * Track user action
   */
  trackAction(action: string, data?: Record<string, any>) {
    this.addBreadcrumb({
      type: 'user',
      category: 'action',
      message: action,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get current breadcrumbs (useful for debugging)
   */
  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs() {
    this.breadcrumbs = [];
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor();

// Convenience functions
export const captureException = (error: unknown, context?: ErrorContext) => {
  errorMonitor.captureException(error, context);
};

export const captureMessage = (message: string, context?: ErrorContext) => {
  errorMonitor.captureMessage(message, context);
};

export const setUser = (user: ErrorContext['user']) => {
  errorMonitor.setUser(user);
};

export const trackAction = (action: string, data?: Record<string, any>) => {
  errorMonitor.trackAction(action, data);
};

export const trackRequest = (url: string, method: string, status?: number) => {
  errorMonitor.trackRequest(url, method, status);
};

export const startTransaction = (name: string, operation: string) => {
  return errorMonitor.startTransaction(name, operation);
};
