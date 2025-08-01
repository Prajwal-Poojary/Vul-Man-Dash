import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  type: string;
  title?: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket | null = null;
  private notificationSubject = new Subject<Notification>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  constructor() {}

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(environment.apiUrl2.replace('/api', ''), {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('notification', (notification: Notification) => {
      this.notificationSubject.next(notification);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.connectionStatusSubject.next(false);
    });
  }

  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', roomId);
    }
  }

  getNotifications(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}