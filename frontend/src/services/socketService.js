import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const devPorts = new Set(['3000', '3001', '3010', '3011', '5173']);
    const useRelative = isDev && devPorts.has(window.location.port || '');

    const serverUrl = useRelative ? '' : (process.env.REACT_APP_API_URL || '');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
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
    if (this.socket && this.isConnected) {
      this.socket.emit('join-auction', auctionId);
      console.log(`Joined auction room: ${auctionId}`);
    }
  }

  // Leave an auction room
  leaveAuction(auctionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-auction', auctionId);
      console.log(`Left auction room: ${auctionId}`);
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