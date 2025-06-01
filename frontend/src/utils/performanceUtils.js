// Performance monitoring and error handling utilities for the chat application

class ChatPerformanceMonitor {
    constructor() {
        this.metrics = {
            messageLoadTimes: [],
            conversationSwitchTimes: [],
            apiCallTimes: [],
            renderTimes: [],
            errorCounts: {},
            cacheHitRates: {}
        };
        this.startTimes = new Map();
    }

    // Start timing a performance metric
    startTiming(label) {
        this.startTimes.set(label, performance.now());
    }

    // End timing and record the metric
    endTiming(label, category = 'general') {
        const startTime = this.startTimes.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.recordMetric(category, duration);
            this.startTimes.delete(label);
            return duration;
        }
        return null;
    }

    // Record a performance metric
    recordMetric(category, value) {
        if (!this.metrics[category]) {
            this.metrics[category] = [];
        }
        this.metrics[category].push({
            value,
            timestamp: Date.now()
        });

        // Keep only last 100 measurements to prevent memory leaks
        if (this.metrics[category].length > 100) {
            this.metrics[category] = this.metrics[category].slice(-100);
        }
    }

    // Record an error
    recordError(error, context = 'unknown') {
        const errorKey = `${context}:${error.name || 'Unknown'}`;
        this.metrics.errorCounts[errorKey] = (this.metrics.errorCounts[errorKey] || 0) + 1;
        
        console.error('Chat Performance Error:', {
            context,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }

    // Record cache hit/miss
    recordCacheEvent(cacheKey, isHit) {
        if (!this.metrics.cacheHitRates[cacheKey]) {
            this.metrics.cacheHitRates[cacheKey] = { hits: 0, misses: 0 };
        }
        
        if (isHit) {
            this.metrics.cacheHitRates[cacheKey].hits++;
        } else {
            this.metrics.cacheHitRates[cacheKey].misses++;
        }
    }

    // Get average for a metric category
    getAverageMetric(category) {
        const values = this.metrics[category];
        if (!values || values.length === 0) return 0;
        
        const sum = values.reduce((acc, item) => acc + item.value, 0);
        return sum / values.length;
    }

    // Get performance summary
    getPerformanceSummary() {
        return {
            averageMessageLoadTime: this.getAverageMetric('messageLoadTimes'),
            averageConversationSwitchTime: this.getAverageMetric('conversationSwitchTimes'),
            averageApiCallTime: this.getAverageMetric('apiCallTimes'),
            averageRenderTime: this.getAverageMetric('renderTimes'),
            errorCounts: { ...this.metrics.errorCounts },
            cacheHitRates: Object.entries(this.metrics.cacheHitRates).reduce((acc, [key, stats]) => {
                const total = stats.hits + stats.misses;
                acc[key] = total > 0 ? (stats.hits / total * 100).toFixed(2) + '%' : '0%';
                return acc;
            }, {}),
            timestamp: new Date().toISOString()
        };
    }

    // Clear all metrics
    clearMetrics() {
        this.metrics = {
            messageLoadTimes: [],
            conversationSwitchTimes: [],
            apiCallTimes: [],
            renderTimes: [],
            errorCounts: {},
            cacheHitRates: {}
        };
        this.startTimes.clear();
    }

    // Log performance summary to console
    logPerformanceSummary() {
        const summary = this.getPerformanceSummary();
        console.group('📊 Chat Performance Summary');
        console.log('⚡ Average Message Load Time:', summary.averageMessageLoadTime.toFixed(2) + 'ms');
        console.log('🔄 Average Conversation Switch Time:', summary.averageConversationSwitchTime.toFixed(2) + 'ms');
        console.log('🌐 Average API Call Time:', summary.averageApiCallTime.toFixed(2) + 'ms');
        console.log('🎨 Average Render Time:', summary.averageRenderTime.toFixed(2) + 'ms');
        console.log('❌ Error Counts:', summary.errorCounts);
        console.log('💾 Cache Hit Rates:', summary.cacheHitRates);
        console.groupEnd();
    }
}

// Error boundary wrapper for React components
class ChatErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Record error in performance monitor
        if (window.chatPerformanceMonitor) {
            window.chatPerformanceMonitor.recordError(error, 'React Error Boundary');
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        The chat component encountered an error. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.location.reload();
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200"
                    >
                        Refresh Page
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-4 w-full max-w-2xl">
                            <summary className="cursor-pointer text-sm text-gray-500">
                                View Error Details (Development)
                            </summary>
                            <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto text-left">
                                {this.state.error.toString()}
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook for using performance monitoring
const usePerformanceMonitor = () => {
    if (!window.chatPerformanceMonitor) {
        window.chatPerformanceMonitor = new ChatPerformanceMonitor();
    }
    return window.chatPerformanceMonitor;
};

// Async error handler with retry logic
const withRetry = async (asyncFn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await asyncFn();
        } catch (error) {
            lastError = error;
            
            if (window.chatPerformanceMonitor) {
                window.chatPerformanceMonitor.recordError(error, `API Retry Attempt ${attempt}`);
            }
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
};

// Debounced function wrapper for performance optimization
const debounce = (func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
};

// Throttled function wrapper for performance optimization
const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

export {
    ChatPerformanceMonitor,
    ChatErrorBoundary,
    usePerformanceMonitor,
    withRetry,
    debounce,
    throttle
};
