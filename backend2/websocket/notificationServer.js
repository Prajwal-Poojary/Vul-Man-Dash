import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

class NotificationServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:4200",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.connectedUsers = new Map();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      this.connectedUsers.set(socket.userId, socket);
      
      // Send welcome message
      socket.emit('notification', {
        type: 'system',
        message: 'Connected to real-time notifications',
        timestamp: new Date().toISOString()
      });
      
      // Handle client events
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);
      });
      
      socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User ${socket.userId} left room ${roomId}`);
      });
      
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.connectedUsers.delete(socket.userId);
      });
    });
  }

  // Send notification to specific user
  notifyUser(userId, notification) {
    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Send notification to all users in a room
  notifyRoom(roomId, notification) {
    this.io.to(roomId).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast to all connected users
  broadcast(notification) {
    this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send security alert
  sendSecurityAlert(alertData) {
    this.broadcast({
      type: 'security-alert',
      severity: alertData.severity || 'high',
      title: alertData.title,
      message: alertData.message,
      data: alertData.data || {}
    });
  }

  // Send performance alert
  sendPerformanceAlert(alertData) {
    this.broadcast({
      type: 'performance-alert',
      severity: alertData.severity || 'medium',
      title: alertData.title,
      message: alertData.message,
      metrics: alertData.metrics || {}
    });
  }

  // Send report updates
  notifyReportUpdate(reportId, updateData) {
    this.notifyRoom(`report-${reportId}`, {
      type: 'report-update',
      reportId,
      updateType: updateData.type,
      message: updateData.message,
      data: updateData.data || {}
    });
  }

  // Send dashboard updates
  notifyDashboardUpdate(dashboardData) {
    this.broadcast({
      type: 'dashboard-update',
      data: dashboardData
    });
  }
}

export default NotificationServer;