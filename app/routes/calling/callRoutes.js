const express = require('express');
const router = express.Router();
const callController = require("../../controllers/callController");

router.post('/v1/createcall', callController.createCall);
router.put('/v1/updateCallDuration', callController.updateCallDuration);
router.put('/v1/updateCallStatus', callController.updateCallStatus);
router.get('/v1/getUserCallsHistory/caller_id=:caller_id', callController.getCallsByCallerId);
router.post('/v1/getUserCallByCallID', callController.getCallByCallId);
router.delete('/v1/removeCallByCallerID', callController.removeCallByCallerId);
router.get('/v1/getRandomUser/:userId', callController.getRandomUser);

module.exports = router;