const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const authenicate = require('../middlewares/authentication');
const authorize = require('../middlewares/authorizeAdmin');

router.get('/matrix', authenicate, authorize, permissionController.getPermissionsMatrix);
router.post('/update/:roleId', authenicate, authorize, permissionController.updateRolePermissions);

module.exports = router;