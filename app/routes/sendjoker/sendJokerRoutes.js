const express = require('express');
const router = express.Router();
const sendJokerController = require("../../controllers/sendJokerController");

router.post('/v1/send', sendJokerController.sendjoker); 
router.get('/v1/get/Joker/List', sendJokerController.getJokerList); 
router.get('/v1/get/User/Joker/:userId', sendJokerController.getUserJoker);     

module.exports = router;