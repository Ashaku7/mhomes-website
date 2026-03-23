// controllers/healthController.js
// Controllers handle HTTP concerns only: parse request, call service, send response.

const healthService = require('../services/healthService');

const getHealth = (req, res) => {
    const status = healthService.getSystemStatus();
    res.status(200).json(status);
};

module.exports = { getHealth };