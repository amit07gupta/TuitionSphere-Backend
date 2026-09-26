const router=require('express').Router(),controller=require('../controllers/tutorProfileController');
router.use(require('../middleware/authenticate'),require('../middleware/authorize')('TUTOR'));
router.get('/',controller.get);router.patch('/',controller.update);router.patch('/settings',controller.settings);router.get('/sessions',controller.sessions);router.delete('/sessions/:id',controller.revokeSession);
module.exports=router;
