const express = require('express');
const router = express.Router();
const answersController = require("../../controllers/answersController");

router.post('/v1/createanswer', answersController.createanswer);
router.get('/v1/getAllAnswers', answersController.getAllAnswers); 
router.get('/v1/getUserAnswers/:user_id', answersController.getUserAnswers); 
router.put('/v1/updateAnswer', answersController.updateAnswer);       

module.exports = router;