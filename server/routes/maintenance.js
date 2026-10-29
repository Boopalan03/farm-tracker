const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getMaintenance,
  addMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getWorkersList,
} = require('../controllers/maintenanceController');

router.get('/', auth, getMaintenance);
router.post('/', auth, addMaintenance);
router.put('/:id', auth, updateMaintenance);
router.delete('/:id', auth, deleteMaintenance);
router.get('/workers', auth, getWorkersList);

module.exports = router;
