const express = require('express');
const { 
    availablePizza,
    addNewPizza,
    upload,
    getImage,
    updatePizza,
    deletePizza
} = require('../controllers/pizza-controller');

const router = express.Router();

router.get("/availablepizza", availablePizza);
router.post("/addnewpizza", upload.single("img"), addNewPizza);
router.get("/getimage/:img", getImage);
router.post("/updatepizza", upload.single("img"), updatePizza);
router.post("/deletepizza", deletePizza);

module.exports = router;