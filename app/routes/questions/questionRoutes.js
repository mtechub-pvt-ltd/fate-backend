const express = require('express');
const router = express.Router();
const questionsController = require("../../controllers/questionsController");

router.post('/v1/createquestion', questionsController.createquestion);
router.get('/v1/getAllQuestions', questionsController.getAllQuestions);
router.get('/v1/getQuestionByID/:id', questionsController.getQuestionByID);
router.put('/v1/updateQuestion/:id', questionsController.updateQuestion);
router.delete('/v1/deleteQuestion/:id', questionsController.deleteQuestion);

module.exports = router;