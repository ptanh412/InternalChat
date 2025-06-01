// Utility for handling cleanup operations when user closes browser/tab
export class CleanupHandler {
    constructor(socket, user) {
        this.socket = socket;
        this.user = user;
        this.isCleanupInProgress = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle browser/tab closure
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('unload', this.handleUnload.bind(this));
        
        // Handle page visibility changes (tab switching, minimizing)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle focus/blur events
        window.addEventListener('blur', this.handleWindowBlur.bind(this));
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
    }

    handleBeforeUnload(event) {
        if (this.socket && this.socket.connected && !this.isCleanupInProgress) {
            this.performCleanup(true);
        }
    }

    handleUnload(event) {
        if (this.socket && this.socket.connected && !this.isCleanupInProgress) {
            this.performCleanup(true);
        }
    }

    handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Tab is being hidden or browser is being minimized
            // Set a timeout to logout if tab stays hidden for too long
            this.hiddenTimeout = setTimeout(() => {
                if (document.visibilityState === 'hidden' && this.socket && this.socket.connected) {
                    this.performCleanup(false);
                }
            }, 30000); // 30 seconds timeout
        } else if (document.visibilityState === 'visible') {
            // Tab is visible again, clear timeout
            if (this.hiddenTimeout) {
                clearTimeout(this.hiddenTimeout);
                this.hiddenTimeout = null;
            }
        }
    }

    handleWindowBlur() {
        // Window lost focus - could be switching to another app
        // Don't immediately logout, just note the event
        this.lastBlurTime = Date.now();
    }

    handleWindowFocus() {
        // Window gained focus - user is back
        if (this.hiddenTimeout) {
            clearTimeout(this.hiddenTimeout);
            this.hiddenTimeout = null;
        }
    }

    performCleanup(isImmediate = false) {
        if (this.isCleanupInProgress) return;
        
        this.isCleanupInProgress = true;
        
        try {
            if (this.socket && this.socket.connected) {
                if (isImmediate) {
                    // For immediate cleanup (page unload), send logout synchronously
                    this.socket.emit('user:logout');
                    this.socket.disconnect();
                } else {
                    // For timeout-based cleanup, allow time for the request
                    this.socket.emit('user:logout');
                    setTimeout(() => {
                        if (this.socket) {
                            this.socket.disconnect();
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    updateSocket(socket) {
        this.socket = socket;
    }

    updateUser(user) {
        this.user = user;
    }

    destroy() {
        // Clean up event listeners
        window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.removeEventListener('unload', this.handleUnload.bind(this));
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('blur', this.handleWindowBlur.bind(this));
        window.removeEventListener('focus', this.handleWindowFocus.bind(this));
        
        if (this.hiddenTimeout) {
            clearTimeout(this.hiddenTimeout);
        }
    }
}

