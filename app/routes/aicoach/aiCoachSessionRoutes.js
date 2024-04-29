const express = require('express');
const router = express.Router();
const SessionController = require("../../controllers/aiCoachSessionController");

router.post('/v1/add', SessionController.addsession);
router.get('/v1/get/sessions/:userId', SessionController.getUserSessions);
router.delete('/v1/delete/:sessionId', SessionController.deleteSession);
router.get('/v1/user/:userId/session/:sessionId', SessionController.getSessionBySessionAndUserId);
router.get('/v1/user/session/:userId', SessionController.getUserWeeklySessions); 
router.get('/v1/session/daily/:userId', SessionController.getUserDailySessions);  

module.exports = router;