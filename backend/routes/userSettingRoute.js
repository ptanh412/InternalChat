const express = require('express');
const router = express.Router();
const userSettingController = require('../controllers/updateSettingController');
const authenticate = require('../middlewares/authentication');

router.get('/:userId', authenticate, userSettingController.getSettingController);
router.put('/:userId', authenticate, userSettingController.updateSettingController);

module.exports = router;