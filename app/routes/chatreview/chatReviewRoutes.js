const express = require('express');
const router = express.Router();
const chatReviewController = require("../../controllers/chatReviewController");

router.post('/v1/review/add', chatReviewController.addreview);
router.get('/v1/get/reviews/list', chatReviewController.getAllChatReviews);
router.get('/v1/get/Reviews/BySender/:sender_id', chatReviewController.getReviewsBySender);
router.get('/v1/get/Reviews/BySender/Receiver/:sender_id/:receiver_id', chatReviewController.getReviewsBySenderReceiver);
router.put('/v1/update/Review', chatReviewController.updateReview);
router.delete('/v1/delete/Review/:review_id', chatReviewController.deleteReview);
router.get('/v1/get/Maximum/Reviews', chatReviewController.getMaximumReviewForReceivers);

module.exports = router;