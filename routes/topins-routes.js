const express = require('express');
const {
    getTopins,
    addTopins,
    removeTopins
} = require('./../controllers/topins-controller')

const router = express.Router();

router.get("/gettopins", getTopins);
router.post("/addtopins", addTopins);
router.post("/removetopins", removeTopins);

module.exports = router;