const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


// allow cor region * 
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1>');
});

const users = {}; // Keep track of users and their socket IDs

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user logs in (assuming they send their userID)
  socket.on('join', ({ userId }) => {
    users[userId] = socket.id;
  });

  // Handle sending private messages
  socket.on('private message', ({ content, toUserId }) => {
    const toSocketId = users[toUserId];
    if (toSocketId) {
      io.to(toSocketId).emit('private message', { content, from: userId });
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    const leavingUserId = Object.keys(users).find(key => users[key] === socket.id);
    console.log(`User disconnected: ${leavingUserId}`);
    delete users[leavingUserId];
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

