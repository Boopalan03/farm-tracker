const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getSales, addSale, deleteSale } = require('../controllers/saleController');

router.get('/', auth, getSales);
router.post('/', auth, addSale);
router.delete('/:id', auth, deleteSale);

module.exports = router;
