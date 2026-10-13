import Peer from 'peerjs';
import { io } from 'socket.io-client';

class RealtimeManager {
  constructor() {
    this.peer = null;
    this.connections = []; // list of DataConnection
    this.activeHostConn = null;
    this.socket = null;
    this.broadcastChannel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('ishaara_transit_channel')
      : null;

    this.listeners = new Map();
    this.statusListeners = [];
    this.roomId = null;
    this.isHost = false;
    this.connectedPeersCount = 0;
  }

  init({ roomId, isHost = false }) {
    this.roomId = roomId || this.generateRoomId();
    this.isHost = isHost;

    // 1. Try Socket.io first (works if local node server or Render backend exists)
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.');

    if (backendUrl || isLocalhost) {
      try {
        const url = backendUrl || window.location.origin;
        this.socket = io(url, {
          reconnection: true,
          reconnectionDelay: 2000,
          timeout: 4000,
          transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
          this.notifyStatus('socket_connected', 1);
        });

        this.socket.on('alert:new', (data) => this.emitLocal('alert:new', data));
        this.socket.on('alert:updated', (data) => this.emitLocal('alert:updated', data));
        this.socket.on('alert:closed', (data) => this.emitLocal('alert:closed', data));
        this.socket.on('demo:reset_done', (data) => this.emitLocal('demo:reset_done', data));
      } catch (e) {
        console.warn('Socket.io connection skipped:', e);
      }
    }

    // 2. Setup BroadcastChannel for cross-tab sync
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type) {
          this.emitLocal(type, data);
        }
      };
    }

    // 3. Setup PeerJS (WebRTC) for serverless multi-device sync on Vercel
    this.initPeerJS();
  }

  generateRoomId() {
    // Generate clean 5-digit bus room code (e.g. "BUS44")
    return 'bus' + Math.floor(1000 + Math.random() * 9000);
  }

  initPeerJS() {
    try {
      const peerId = this.isHost
        ? `ishaara-room-${this.roomId}`
        : `ishaara-client-${Math.random().toString(36).slice(2, 8)}`;

      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        if (!this.isHost) {
          // Connect to the host peer
          this.connectToHost();
        } else {
          this.notifyStatus('peer_ready', this.connections.length);
        }
      });

      // When someone connects to this host
      this.peer.on('connection', (conn) => {
        this.handleNewConnection(conn);
      });

      this.peer.on('error', (err) => {
        // If host ID is already taken, connect as client
        if (err.type === 'unavailable-id' && this.isHost) {
          this.isHost = false;
          this.initPeerJS();
        }
      });
    } catch (err) {
      console.warn('PeerJS init failed:', err);
    }
  }

  connectToHost() {
    if (!this.peer) return;
    const targetHostId = `ishaara-room-${this.roomId}`;
    const conn = this.peer.connect(targetHostId, { reliable: true });

    conn.on('open', () => {
      this.activeHostConn = conn;
      this.notifyStatus('peer_connected', 1);
    });

    conn.on('data', (payload) => {
      if (payload && payload.type) {
        this.emitLocal(payload.type, payload.data);
      }
    });

    conn.on('close', () => {
      this.activeHostConn = null;
      this.notifyStatus('peer_disconnected', 0);
    });
  }

  handleNewConnection(conn) {
    this.connections.push(conn);
    this.connectedPeersCount = this.connections.length;
    this.notifyStatus('peer_connected', this.connectedPeersCount);

    conn.on('data', (payload) => {
      if (payload && payload.type) {
        // 1. Process locally on host
        this.emitLocal(payload.type, payload.data);
        // 2. Broadcast to other connected peers (if any)
        this.broadcastToPeers(payload, conn);
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.connectedPeersCount = this.connections.length;
      this.notifyStatus('peer_disconnected', this.connectedPeersCount);
    });
  }

  broadcastToPeers(payload, senderConn = null) {
    this.connections.forEach(conn => {
      if (conn !== senderConn && conn.open) {
        try {
          conn.send(payload);
        } catch (e) {}
      }
    });
  }

  // Unified broadcast method
  send(type, data) {
    const payload = { type, data };

    // 1. Local event
    this.emitLocal(type, data);

    // 2. BroadcastChannel (cross-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {}
    }

    // 3. Socket.io (if connected)
    if (this.socket && this.socket.connected) {
      this.socket.emit(type, data);
    }

    // 4. WebRTC PeerJS
    if (this.isHost) {
      this.broadcastToPeers(payload);
    } else if (this.activeHostConn && this.activeHostConn.open) {
      try {
        this.activeHostConn.send(payload);
      } catch (e) {}
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  emitLocal(type, data) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error('Listener callback error:', e);
        }
      });
    }
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  notifyStatus(status, peerCount) {
    this.statusListeners.forEach(cb => {
      try {
        cb({ status, peerCount, roomId: this.roomId });
      } catch (e) {}
    });
  }
}

export const realtime = new RealtimeManager();
