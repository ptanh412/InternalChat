const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const {check} = require('express-validator');
const authenticate = require('../middlewares/authentication');
const authorization = require('../middlewares/authorizeAdmin');


const createRoleValidation = [
	check('name').notEmpty().withMessage('Role name is required')
	.isIn(['admin', 'user', 'department_head', 'deputy_head', 'project_leader', 'deputy_leader']).withMessage('Invalid role name'),
]

router.get('/', authenticate,authorization, roleController.getAll);
router.get('/:roleId', authenticate, authorization, roleController.getPermissionByScope);
router.post('/', authenticate, authorization, createRoleValidation, roleController.create);
router.put('/:roleId', authenticate, authorization, roleController.update);
// router.delete('/:roleId', authenticate, authorization, roleController.);


module.exports = router;