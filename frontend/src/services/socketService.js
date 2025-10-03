import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.desiredRooms = new Set();
    this._attemptedRelative = false;
    this._attemptedAbsolute = false;
    this._attemptedPollingRelative = false;
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const envApiUrl = process.env.REACT_APP_API_URL || '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const defaultBackend = `http://${hostname}:5006`;
    // Use absolute env URL only if explicitly absolute; otherwise fall back to backend
    const absoluteFromEnv = /^https?:\/\//.test(envApiUrl)
      ? envApiUrl.replace(/\/api\/?$/, '')
      : null;
    // Prefer relative proxy first in development; CRA proxy supports WebSocket
    const serverUrl = '/';
    this._attemptedAbsolute = false;
    this._attemptedRelative = true;
    console.log('Initializing WebSocket connection to:', '(relative same-origin via proxy)');

    this.socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      path: '/socket.io',
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      // Ensure we join any rooms requested before connection established
      this.desiredRooms.forEach((auctionId) => {
        try {
          this.socket.emit('join-auction', auctionId);
          console.log(`Joined auction room on connect: ${auctionId}`);
        } catch (e) {
          // no-op
        }
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      // First fallback: try relative with polling-only to avoid WS upgrade issues via proxy
      if (this._attemptedRelative && !this._attemptedPollingRelative) {
        this._attemptedPollingRelative = true;
        try {
          console.log('Retrying WebSocket using relative polling-only...');
          this.disconnect();
          this.socket = io('/', {
            transports: ['polling'],
            timeout: 20000,
            forceNew: true,
            path: '/socket.io',
            withCredentials: true
          });
          this.socket.on('connect', () => {
            console.log('Connected to WebSocket server (relative polling-only)');
            this.isConnected = true;
            this.desiredRooms.forEach((auctionId) => {
              try { this.socket.emit('join-auction', auctionId); } catch {}
            });
          });
          this.socket.on('disconnect', () => { this.isConnected = false; });
          return; // don't proceed to absolute yet
        } catch (e) {
          console.error('Relative polling-only retry failed:', e);
        }
      }
      // Second fallback: try absolute backend URL
      if (this._attemptedRelative && !this._attemptedAbsolute) {
        this._attemptedAbsolute = true;
        try {
          console.log('Retrying WebSocket connection using absolute backend URL...');
          this.disconnect();
          const target = absoluteFromEnv || defaultBackend;
          this.socket = io(target, {
            transports: ['polling', 'websocket'],
            timeout: 20000,
            forceNew: true,
            path: '/socket.io',
            withCredentials: true
          });
          this.socket.on('connect', () => {
            console.log('Connected to WebSocket server (absolute backend)');
            this.isConnected = true;
            this.desiredRooms.forEach((auctionId) => {
              try { this.socket.emit('join-auction', auctionId); } catch {}
            });
          });
          this.socket.on('disconnect', () => { this.isConnected = false; });
        } catch (e) {
          console.error('Absolute backend WebSocket retry failed:', e);
        }
      }
    });

    this.socket.on('reconnect', () => {
      console.log('WebSocket reconnected');
      this.isConnected = true;
      this.desiredRooms.forEach((auctionId) => {
        try { this.socket.emit('join-auction', auctionId); } catch {}
      });
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Join an auction room for real-time updates
  joinAuction(auctionId) {
    // Record desired room so we can join upon reconnects
    if (auctionId) this.desiredRooms.add(auctionId);
    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('join-auction', auctionId);
        console.log(`Joined auction room: ${auctionId}`);
      } catch (e) {
        // no-op
      }
    }
  }

  // Leave an auction room
  leaveAuction(auctionId) {
    if (auctionId) this.desiredRooms.delete(auctionId);
    if (this.socket && this.isConnected) {
      try {
        this.socket.emit('leave-auction', auctionId);
        console.log(`Left auction room: ${auctionId}`);
      } catch (e) {
        // no-op
      }
    }
  }

  // Listen for new bids
  onNewBid(callback) {
    if (this.socket) {
      const wrapped = (payload) => {
        const bid = payload && typeof payload === 'object' && 'bid' in payload ? payload.bid : payload;
        callback(bid);
      };
      this.socket.on('new-bid', wrapped);
      this.listeners.set('new-bid', wrapped);
    }
  }

  // Listen for outbid notifications
  onOutbid(callback) {
    if (this.socket) {
      this.socket.on('outbid', callback);
      this.listeners.set('outbid', callback);
    }
  }

  // Listen for auction status updates
  onAuctionUpdate(callback) {
    if (this.socket) {
      this.socket.on('auction-update', callback);
      this.listeners.set('auction-update', callback);
    }
  }

  // Listen for bid errors
  onBidError(callback) {
    if (this.socket) {
      this.socket.on('bid-error', callback);
      this.listeners.set('bid-error', callback);
    }
  }

  // Remove specific event listener
  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  // Remove all event listeners
  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, event) => {
        this.socket.off(event, callback);
      });
      this.listeners.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;