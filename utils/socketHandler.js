// Socket.io handler for real-time communication
class SocketHandler {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> socket.id mapping
        this.instructorSockets = new Map(); // instructorId -> socket.id mapping
    }

    initialize(io) {
        this.io = io;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        if (!this.io) {return;}

        this.io.on('connection', (socket) => {
            console.log('New socket connection:', socket.id);

            // Handle user authentication
            socket.on('authenticate', (data) => {
                if (data.userId) {
                    this.userSockets.set(data.userId, socket.id);
                    socket.userId = data.userId;
                    socket.join(`user-${data.userId}`);

                    // Check if user is instructor
                    if (data.role === 'instructor' || data.role === 'admin') {
                        this.instructorSockets.set(data.userId, socket.id);
                        socket.join('instructors');
                    }
                }
            });

            // Handle joining specific rooms
            socket.on('join-room', (room) => {
                socket.join(room);
            });

            socket.on('leave-room', (room) => {
                socket.leave(room);
            });

            // Handle joining user room for personal notifications
            socket.on('join-user-room', (userId) => {
                socket.join(`user-${userId}`);
                this.userSockets.set(userId, socket.id);
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                if (socket.userId) {
                    this.userSockets.delete(socket.userId);
                    this.instructorSockets.delete(socket.userId);
                }
                console.log('Socket disconnected:', socket.id);
            });

            // Proctoring events
            socket.on('proctoring-start', (data) => {
                socket.join(`proctoring-${data.testSessionId}`);
            });

            socket.on('proctoring-violation', (data) => {
                this.emitToInstructors('proctoring-violation', data);
            });

            socket.on('proctoring-screenshot', (data) => {
                this.emitToInstructors('proctoring-screenshot', data);
            });

            // Test events
            socket.on('test-started', (data) => {
                socket.join(`test-${data.testId}`);
                this.emitToInstructors('student-test-started', data);
            });

            socket.on('test-completed', (data) => {
                socket.leave(`test-${data.testId}`);
                this.emitToInstructors('student-test-completed', data);
            });
        });
    }

    // Emit to specific user
    emitToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user-${userId}`).emit(event, data);
        }
    }

    // Emit to all instructors
    emitToInstructors(event, data) {
        if (this.io) {
            this.io.to('instructors').emit(event, data);
        }
    }

    // Emit to specific room
    emitToRoom(room, event, data) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }

    // Broadcast to all connected clients
    broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    // Get socket by user ID
    getSocketByUserId(userId) {
        const socketId = this.userSockets.get(userId);
        if (socketId && this.io) {
            return this.io.sockets.sockets.get(socketId);
        }
        return null;
    }

    // Check if user is online
    isUserOnline(userId) {
        return this.userSockets.has(userId);
    }

    // Get online users count
    getOnlineUsersCount() {
        return this.userSockets.size;
    }

    // Get online instructors count
    getOnlineInstructorsCount() {
        return this.instructorSockets.size;
    }
}

// Create singleton instance
const socketHandler = new SocketHandler();

module.exports = socketHandler;