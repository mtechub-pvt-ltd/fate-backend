const express = require('express');
const router = express.Router();
const chatController = require("../../controllers/chatController");

router.post('/v1/createchat', chatController.createchat);  

module.exports = router;