const express = require('express');
const router = express.Router();
const userCardLogController = require("../../controllers/usercardlogController");

router.get('/v1/getAll', userCardLogController.getalluserlogs);
router.post('/v1/getUserLogsByDate', userCardLogController.getUserLogsByDate);  
router.get('/v1/getUserLogs/:login_user_id', userCardLogController.getUserLogs); 
router.get('/v1/getUserLogsByDateAndId/:login_user_id/:date', userCardLogController.getUserLogsByDateAndId);    

module.exports = router;