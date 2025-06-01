// Conversation preloader service for optimizing conversation switching performance
import axios from 'axios';
import clientEncryptionService from '../helper/encryptionService';

class ConversationPreloader {
    constructor() {
        this.prefetchQueue = new Set();
        this.prefetchCache = new Map();
        this.isProcessing = false;
        this.maxCacheSize = 10; // Maximum number of conversations to cache
        this.prefetchDelay = 200; // Delay in ms before starting prefetch
        this.accessOrder = []; // Track access order for LRU eviction
    }

    // Schedule a conversation for prefetching
    schedulePrefetch(conversationId, priority = 'normal') {
        if (this.prefetchCache.has(conversationId)) {
            this.updateAccessOrder(conversationId);
            return; // Already cached
        }        this.prefetchQueue.add({
            conversationId,
            priority,
            timestamp: Date.now()
        });

        if (!this.isProcessing) {
            // Use shorter delay for immediate priority
            const delay = priority === 'immediate' ? 0 : this.prefetchDelay;
            setTimeout(() => this.processPrefetchQueue(), delay);
        }
    }

    // Process the prefetch queue
    async processPrefetchQueue() {
        if (this.isProcessing || this.prefetchQueue.size === 0) return;

        this.isProcessing = true;
        const items = Array.from(this.prefetchQueue);
          // Sort by priority and timestamp
        items.sort((a, b) => {
            // Immediate priority comes first
            if (a.priority === 'immediate' && b.priority !== 'immediate') return -1;
            if (b.priority === 'immediate' && a.priority !== 'immediate') return 1;
            // Then high priority
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return a.timestamp - b.timestamp;
        });

        this.prefetchQueue.clear();

        // Process up to 3 items concurrently
        const batch = items.slice(0, 3);
        await Promise.allSettled(
            batch.map(item => this.prefetchConversation(item.conversationId))
        );

        this.isProcessing = false;

        // Process remaining items if any
        if (items.length > 3) {
            items.slice(3).forEach(item => this.prefetchQueue.add(item));
            setTimeout(() => this.processPrefetchQueue(), 100);
        }
    }

    // Prefetch messages for a conversation
    async prefetchConversation(conversationId) {
        try {
            const startTime = performance.now();
            
            // Check if already cached
            if (this.prefetchCache.has(conversationId)) {
                return this.prefetchCache.get(conversationId);
            }

            // Fetch recent messages
            const response = await axios.get(
                `${process.env.REACT_APP_BACKEND_URL}/api/messages/recent/${conversationId}`,
                {
                    params: { limit: 20 },
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            const messages = response.data.messages || [];
            
            // Decrypt messages if needed
            const decryptedMessages = await Promise.all(
                messages.map(async (msg) => {
                    if (msg.content && msg.content.startsWith('enc:')) {
                        try {
                            const decrypted = await clientEncryptionService.decryptMessage(msg.content);
                            return { ...msg, content: decrypted };
                        } catch (error) {
                            console.error('Failed to decrypt message:', error);
                            return msg;
                        }
                    }
                    return msg;
                })
            );

            const cacheData = {
                messages: decryptedMessages,
                hasMore: messages.length === 20,
                page: 1,
                timestamp: Date.now(),
                loadTime: performance.now() - startTime
            };

            // Manage cache size with LRU eviction
            this.manageCacheSize();
            this.prefetchCache.set(conversationId, cacheData);
            this.updateAccessOrder(conversationId);

            console.log(`Prefetched ${messages.length} messages for conversation ${conversationId} in ${cacheData.loadTime.toFixed(2)}ms`);
            
            return cacheData;
        } catch (error) {
            console.error('Failed to prefetch conversation:', conversationId, error);
            return null;
        }
    }

    // Get cached conversation data
    getCachedConversation(conversationId) {
        if (this.prefetchCache.has(conversationId)) {
            const data = this.prefetchCache.get(conversationId);
            this.updateAccessOrder(conversationId);
            
            // Check if cache is still valid (5 minutes for prefetched data)
            const cacheAge = Date.now() - data.timestamp;
            if (cacheAge < 5 * 60 * 1000) {
                return data;
            } else {
                // Remove expired cache
                this.prefetchCache.delete(conversationId);
                this.accessOrder = this.accessOrder.filter(id => id !== conversationId);
                return null;
            }
        }
        return null;
    }

    // Update access order for LRU
    updateAccessOrder(conversationId) {
        this.accessOrder = this.accessOrder.filter(id => id !== conversationId);
        this.accessOrder.push(conversationId);
    }

    // Manage cache size with LRU eviction
    manageCacheSize() {
        while (this.prefetchCache.size >= this.maxCacheSize && this.accessOrder.length > 0) {
            const lruId = this.accessOrder.shift();
            this.prefetchCache.delete(lruId);
        }
    }

    // Clear cache for a specific conversation
    clearCache(conversationId) {
        this.prefetchCache.delete(conversationId);
        this.accessOrder = this.accessOrder.filter(id => id !== conversationId);
    }

    // Clear all cache
    clearAllCache() {
        this.prefetchCache.clear();
        this.accessOrder = [];
        this.prefetchQueue.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            cacheSize: this.prefetchCache.size,
            queueSize: this.prefetchQueue.size,
            hitRate: this.calculateHitRate(),
            averageLoadTime: this.calculateAverageLoadTime()
        };
    }

    // Calculate cache hit rate
    calculateHitRate() {
        // This would need to be tracked over time
        // For now, return a simple metric
        return this.prefetchCache.size / this.maxCacheSize;
    }

    // Calculate average load time
    calculateAverageLoadTime() {
        const loadTimes = Array.from(this.prefetchCache.values())
            .map(data => data.loadTime)
            .filter(time => time);
        
        if (loadTimes.length === 0) return 0;
        return loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    }

    // Warm up cache with frequently accessed conversations
    async warmUpCache(conversations) {
        if (!conversations || conversations.length === 0) return;

        // Get the 5 most recent conversations
        const recentConversations = conversations
            .filter(conv => conv.conversationInfo?.lastMessage)
            .sort((a, b) => {
                const aTime = new Date(a.conversationInfo.lastMessage.timestamp).getTime();
                const bTime = new Date(b.conversationInfo.lastMessage.timestamp).getTime();
                return bTime - aTime;
            })
            .slice(0, 5);

        // Prefetch with high priority
        for (const conv of recentConversations) {
            this.schedulePrefetch(conv.conversationInfo._id, 'high');
        }
    }

    // Background refresh of frequently accessed conversations
    async backgroundRefresh() {
        const now = Date.now();
        const frequentlyAccessed = this.accessOrder.slice(-3); // Last 3 accessed

        for (const conversationId of frequentlyAccessed) {
            const cached = this.prefetchCache.get(conversationId);
            if (cached) {
                const age = now - cached.timestamp;
                // Refresh if older than 2 minutes
                if (age > 2 * 60 * 1000) {
                    this.schedulePrefetch(conversationId, 'normal');
                }
            }
        }
    }

    // Start background refresh timer
    startBackgroundRefresh() {
        setInterval(() => {
            this.backgroundRefresh();
        }, 30000); // Every 30 seconds
    }
}

// Create singleton instance
const conversationPreloader = new ConversationPreloader();

export default conversationPreloader;
