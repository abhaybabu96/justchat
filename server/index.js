const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => res.send('QuickChat server is running'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (code) => {
    socket.join(code);
    socket.roomCode = code;
    roomUsers[code] = (roomUsers[code] || 0) + 1;
    io.to(code).emit('user-count', roomUsers[code]);
  });

  socket.on('send-message', ({ code, text }) => {
    socket.to(code).emit('receive-message', { text });
  });

  socket.on('typing', (code) => {
    socket.to(code).emit('typing');
  });

  socket.on('stop-typing', (code) => {
    socket.to(code).emit('stop-typing');
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (code && roomUsers[code]) {
      roomUsers[code] = Math.max(0, roomUsers[code] - 1);
      io.to(code).emit('user-count', roomUsers[code]);
      if (roomUsers[code] === 0) delete roomUsers[code];
    }
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});