import React, { useState, useEffect, useRef, useMemo } from 'react';

const VirtualizedMessageList = ({ 
    messages, 
    containerHeight = 400, 
    itemHeight = 80, 
    renderMessage, 
    loading = false,
    hasMoreMessages = false,
    loadMoreMessages,
    loadingMore = false,
    className = ""
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const containerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    
    const overscan = 5; // Number of items to render outside visible area
    
    // Calculate visible range
    const visibleRange = useMemo(() => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const endIndex = Math.min(messages.length - 1, startIndex + visibleCount + overscan * 2);
        
        return { startIndex, endIndex };
    }, [scrollTop, containerHeight, itemHeight, messages.length, overscan]);
    
    // Get visible messages
    const visibleMessages = useMemo(() => {
        const { startIndex, endIndex } = visibleRange;
        return messages.slice(startIndex, endIndex + 1).map((message, index) => ({
            ...message,
            originalIndex: startIndex + index
        }));
    }, [messages, visibleRange]);
    
    // Calculate total height and offset
    const totalHeight = messages.length * itemHeight;
    const offsetY = visibleRange.startIndex * itemHeight;
    
    const handleScroll = (e) => {
        const newScrollTop = e.target.scrollTop;
        setScrollTop(newScrollTop);
        setIsScrolling(true);
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set scrolling to false after scroll ends
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 150);
        
        // Load more messages when near top
        if (newScrollTop < 500 && hasMoreMessages && !loadingMore && loadMoreMessages) {
            loadMoreMessages();
        }
    };
    
    // Auto scroll to bottom for new messages
    useEffect(() => {
        if (containerRef.current && !isScrolling) {
            const container = containerRef.current;
            const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
            
            if (isAtBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [messages.length, isScrolling]);
    
    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);
    
    if (loading) {
        return (
            <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }
    
    return (
        <div
            ref={containerRef}
            className={`overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-500 ${className}`}
            style={{ height: containerHeight }}
            onScroll={handleScroll}
        >
            {/* Load More Messages Button */}
            {hasMoreMessages && !loadingMore && (
                <div className="flex justify-center mb-4 sticky top-0 z-10">
                    <button
                        onClick={loadMoreMessages}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors duration-200 shadow-md"
                    >
                        Load More Messages
                    </button>
                </div>
            )}
            
            {/* Loading More Indicator */}
            {loadingMore && (
                <div className="flex justify-center items-center mb-4 sticky top-0 z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading more messages...</span>
                </div>
            )}
            
            {/* Virtual container */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {/* Visible messages */}
                <div
                    style={{
                        transform: `translateY(${offsetY}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                    }}
                >
                    {visibleMessages.map((message, index) => (
                        <div
                            key={message._id || message.tempId}
                            style={{
                                height: itemHeight,
                                minHeight: itemHeight
                            }}
                        >
                            {renderMessage(message, message.originalIndex)}
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Scroll to bottom indicator */}
            {isScrolling && scrollTop > 1000 && (
                <button
                    onClick={() => {
                        if (containerRef.current) {
                            containerRef.current.scrollTop = containerRef.current.scrollHeight;
                        }
                    }}
                    className="fixed bottom-20 right-8 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-20"
                    style={{ display: isScrolling ? 'block' : 'none' }}
                >
                    ↓
                </button>
            )}
        </div>
    );
};

export default VirtualizedMessageList;
