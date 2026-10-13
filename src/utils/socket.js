import { io } from 'socket.io-client';

// Determine backend URL:
// 1. If VITE_BACKEND_URL environment variable is provided (e.g. on Vercel connecting to Render/Railway)
// 2. Otherwise use window.location.origin
const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

// Check if running on Vercel without an external backend
const isVercelStandalone = window.location.hostname.endsWith('vercel.app') && !import.meta.env.VITE_BACKEND_URL;

export const socket = io(backendUrl, {
  reconnectionDelay: 2000,
  reconnection: !isVercelStandalone,
  autoConnect: !isVercelStandalone,
  timeout: 5000,
  transports: ['websocket', 'polling']
});

// BroadcastChannel for cross-tab instant synchronization (works 100% on Vercel & static deployments!)
export const broadcastChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('ishaara_transit_channel')
  : null;
