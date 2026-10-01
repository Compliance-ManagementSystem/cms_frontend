/**
 * Real-Time WebSocket Service (Socket.IO client)
 *
 * Manages live socket connection to backend, authentication,
 * and event subscription channels for notifications, tasks, and compliance changes.
 */

import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Connect to Socket.IO server
   */
  public connect(token?: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).origin
      : 'http://localhost:5003';

    this.socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      // Re-register active event listeners if reconnecting
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb);
        });
      });
    });

    this.socket.on('disconnect', () => {
      // disconnected
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to a socket event
   */
  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unbind unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from a socket event
   */
  public off(event: string, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Join an entity room
   */
  public joinEntity(entityId: string): void {
    if (this.socket && entityId) {
      this.socket.emit('join:entity', entityId);
    }
  }

  /**
   * Leave an entity room
   */
  public leaveEntity(entityId: string): void {
    if (this.socket && entityId) {
      this.socket.emit('leave:entity', entityId);
    }
  }
}

export const socketService = new SocketService();
