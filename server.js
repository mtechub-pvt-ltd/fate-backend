const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')
const bodyParser = require("body-parser");
const pool = require("./app/config/dbconfig")
const app = express();
const port = 5021;
const socketIo = require('socket.io');
const http = require('http');

dotenv.config();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
}));

app.use(express.json())

app.use("/user", require("./app/routes/users/userRoutes"))
app.use("/questions", require("./app/routes/questions/questionRoutes"))
app.use("/answers", require("./app/routes/answers/answersRoutes"))
app.use("/images", require("./app/routes/images/imageRoutes"))
app.use("/user/log", require("./app/routes/usercardlog/userCardLogRoutes"))
app.use("/calls", require("./app/routes/calling/callRoutes"))
app.use("/connections", require("./app/routes/connections/connectionRoutes"))
app.use("/chats", require("./app/routes/chats/chatRoutes"))
app.use("/users", require("./app/routes/reports/reportRoutes"))
app.use("/notifications", require("./app/routes/notifications/notificationRoutes"))
app.use("/user", require("./app/routes/disqualifyuser/disqualifyUserRoutes"))
app.use("/chat", require("./app/routes/chatreview/chatReviewRoutes"))
app.use("/joker", require("./app/routes/sendjoker/sendJokerRoutes"))
app.use("/advertisement", require("./app/routes/advertisement/advertizementRoutes"))
app.use("/subscription", require("./app/routes/subscription/subscriptionRoutes"))
app.use("/session", require("./app/routes/aicoach/aiCoachSessionRoutes"))

app.get('/', (req, res) => {
  res.json({ message: 'Fate!' });
});



app.get('/messages/v1/getAll', async (req, res) => {
  // WHERE deleted_from = false
  try {
    const result = await pool.query('SELECT * FROM chats  WHERE deleted_from = false');
    res.json({ msg: "All messges fetched", error: false, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching messages from the database:', error);
    res.status(500).json({ error: true, msg: 'Internal Server Error' });
  }
});

app.get('/messages/v1/getByUser/:senderId', async (req, res) => {
  const senderId = req.params.senderId;

  try {
    const result = await pool.query(
      `SELECT 
              u.id as receiver_id,
              u.name as receiver_name,
              u.email as receiver_email,
              u.profile_image as receiver_profile_image,
              MAX(c.message) as last_message,
              MAX(c.created_at) as created_at,
              COUNT(CASE WHEN c.read_status = FALSE THEN 1 END) as unread_status
          FROM 
              users u
          LEFT JOIN chats c ON u.id = c.receiver_id
          WHERE 
              c.sender_id = $1
          GROUP BY 
              u.id, u.name, u.email, u.profile_image
          ORDER BY 
              MAX(c.created_at) DESC`,
      [senderId]
    );

    if (result.rows.length > 0) {
      res.json({ error: false, data: result.rows });
    } else {
      res.status(404).json({ error: true, msg: 'No contacts found for the sender' });
    }
  } catch (error) {
    console.error('Error fetching sender contacts:', error);
    res.status(500).json({ error: true, msg: 'Internal server error' });
  }
});

app.put('/messages/v1/updateReadStatus', async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    // Update the read status
    const result = await pool.query(
      'UPDATE chats SET read_status = TRUE WHERE sender_id = $1 AND receiver_id = $2',
      [senderId, receiverId]
    );

    if (result.rowCount > 0) {
      // Fetch sender details
      const senderResult = await pool.query('SELECT * FROM users WHERE id = $1', [senderId]);
      const sender = senderResult.rows[0];

      // Fetch receiver details
      const receiverResult = await pool.query('SELECT * FROM users WHERE id = $1', [receiverId]);
      const receiver = receiverResult.rows[0];

      // Construct response object
      const data = {
        sender: sender,
        receiver: receiver
      };

      res.json({ error: false, msg: 'Read status updated successfully', data: data });
    } else {
      res.status(404).json({ error: true, msg: 'No messages found with the given sender and receiver' });
    }
  } catch (error) {
    console.error('Error updating read status:', error);
    res.status(500).json({ error: true, msg: 'Internal server error' });
  }
});

app.get('/messages/v1/getByUsers/:senderId/:receiverId', async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM chats WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) AND deleted_from = false ORDER BY created_at ASC',
      [senderId, receiverId]
    );

    if (result.rowCount === 0) {
      // No matching records found or all matching records have deleted_from as true
      res.status(404).json({ error: true, msg: 'Chat not found' });
    } else {
      res.json({ msg: "Messages fetched for the sender and receiver", error: false, data: result.rows });
    }
  } catch (error) {
    console.error('Error fetching messages for the sender and receiver from the database:', error);
    res.status(500).json({ error: true, msg: 'Internal Server Error' });
  }
});

app.delete('/messages/v1/deleteChat/:senderId/:receiverId', async (req, res) => {
  const { senderId, receiverId } = req.params;

  try {
    const result = await pool.query(
      'UPDATE chats SET deleted_from = true WHERE sender_id = $1 AND receiver_id = $2 RETURNING *',
      [senderId, receiverId]
    );

    if (result.rowCount === 0) {
      // No matching records found
      res.status(404).json({ error: true, msg: 'No matching records found for the given sender and receiver IDs' });
    } else {
      res.json({ msg: 'Messages marked as deleted for the sender and receiver', error: false, data: result.rows });
    }
  } catch (error) {
    console.error('Error updating deleted_from status in the database:', error);
    res.status(500).json({ error: true, msg: 'Internal Server Error' });
  }
});
app.put('/messages/v1/markAsRead', async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    const result = await pool.query(
      'UPDATE messages SET read_status = true WHERE sender_id = $1 AND receiver_id = $2 AND read_status = false',
      [senderId, receiverId]
    );

    if (result.rowCount > 0) {
      res.json({ error: false, msg: 'Messages marked as read' });
    } else {
      res.status(404).json({ error: true, msg: 'No unread messages found' });
    }
  } catch (error) {
    console.error('Error updating read status:', error);
    res.status(500).json({ error: true, msg: 'Internal server error' });
  }
});










// ######################################




// socker io implementation
const server = http.createServer(app);
const io = socketIo(server);


// add in db

const saveMessage = async (roomId, senderId, receiverId, content, timestamp1, read_status) => {
  console.log("timestamp1", timestamp1)
  const query = 'INSERT INTO messages (chat_room_id, sender_id, receiver_id, content,timestamp1,read_status) VALUES ($1, $2, $3, $4, $5, $6)';
  await pool.query(query, [roomId, senderId, receiverId, content, timestamp1, read_status]);
};

const getMessagesByRoom = async (roomId) => {
  // mark all messages as read
  const updateQuery = 'UPDATE messages SET read_status = true WHERE chat_room_id = $1 AND read_status = false';
  await pool.query(updateQuery, [roomId]);

  const query = 'SELECT * FROM messages WHERE chat_room_id = $1 ORDER BY created_at ASC';
  const { rows } = await pool.query(query, [roomId]);
  return rows;
};

// Create room name from user IDs
const createRoomName = (userId1, userId2) => {
  const userIds = [userId1, userId2].sort();
  return `room_${userIds[0]}_${userIds[1]}`;
};

// Connection event
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Event for joining a chat room
  socket.on('joinChat', async ({ user1Id, user2Id }) => {
    const roomName = createRoomName(user1Id, user2Id);

    try {
      // Check if the room already exists and get the ID
      let roomQuery = 'SELECT id FROM chat_rooms WHERE room_name = $1';
      let res = await pool.query(roomQuery, [roomName]);

      let roomId;
      if (res.rows.length > 0) {
        roomId = res.rows[0].id;
      } else {
        // If not, create a new room and get the ID
        roomQuery = 'INSERT INTO chat_rooms (room_name) VALUES ($1) RETURNING id';
        res = await pool.query(roomQuery, [roomName]);
        roomId = res.rows[0].id;
      }

      socket.join(roomName); // Join the room in Socket.io

      const messages = await getMessagesByRoom(roomId);
      socket.emit('message history', messages); // Send message history to the user
    } catch (error) {
      console.error('Error handling joinChat event:', error);
      // Handle the error, possibly by sending an error message back to the client
    }
  });

  // Event for a user sending a message to the chat room
  socket.on('sendMessage', async ({ room, message, senderId, receiverId, timestamp1, read_status }) => {
    // Get the roomId from the database
    const roomQuery = 'SELECT id FROM chat_rooms WHERE room_name = $1';
    const res = await pool.query(roomQuery, [room]);
    const roomId = res.rows[0].id;

    // Save the message to the database
    await saveMessage(roomId, senderId, receiverId, message, timestamp1, read_status);

    // Emit the message to the room
    io.to(room).emit('message', { content: message, senderId: senderId });

    // Note: The actual 'message' event payload should include the message ID and timestamp if needed
  });

  // WebRTC signaling events
   socket.on('joinVideoCall', async ({ user1Id, user2Id }) => {
    const roomName = createRoomName(user1Id, user2Id);

    try {
      // Check if the room already exists and get the ID
      let roomQuery = 'SELECT id FROM video_call_rooms WHERE room_name = $1';
      let res = await pool.query(roomQuery, [roomName]);

      let roomId;
      if (res.rows.length > 0) {
        roomId = res.rows[0].id;
      } else {
        // If not, create a new room and get the ID
        roomQuery = 'INSERT INTO video_call_rooms (room_name) VALUES ($1) RETURNING id';
        res = await pool.query(roomQuery, [roomName]);
        roomId = res.rows[0].id;
      }

      socket.join(roomName); // Join the room in Socket.io
      socket.emit('joinedVideoCall', { room: roomName }); // Send confirmation to the user
    } catch (error) {
      console.error('Error handling joinVideoCall event:', error);
      // Handle the error, possibly by sending an error message back to the client
    }
  });
   socket.on('offer', ({ room, offer }) => {
    console.log(`Received offer for room: ${room}`);
    socket.to(room).emit('offer', { offer });
  });

  socket.on('answer', ({ room, answer }) => {
    console.log(`Received answer for room: ${room}`);
    socket.to(room).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ room, candidate }) => {
    console.log(`Received ICE candidate for room: ${room}`);
    socket.to(room).emit('ice-candidate', { candidate });
  });

 

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Socket ${socket.id} disconnected`);
    // Additional logic to handle user disconnection
  });
  


});



server.listen(port, () => {
  console.log(`Fate is running on port ${port}.`);
}); 