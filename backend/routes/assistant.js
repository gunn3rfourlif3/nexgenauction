const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { queryAssistant } = require('../controllers/assistantController');

router.post('/query', optionalAuth, queryAssistant);

module.exports = router;