const express = require('express');
const router = express.Router();
const reportController = require("../../controllers/reportController");

router.post('/v1/reportuser', reportController.reportuser);
router.get('/v1/getReportsList', reportController.getAllReports);
router.get('/v1/getReportedUsers/:reporter_id', reportController.getReportedUsersByReporter);

module.exports = router;