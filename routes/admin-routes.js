const express = require('express');
const { 
    signup, 
    login, 
    verifyToken, 
    refreshToken, 
    verifyEmailToken,
    forgotPassword,
    verifyOTP,
    setPassword,
    logout,
    getAdmin,
} = require('../controllers/admin-controller');

const router = express.Router();

router.post('/signup',signup);
router.post('/login', login);
router.get('/dashboard', verifyToken, getAdmin);
router.get("/refresh", refreshToken, verifyToken, getAdmin);
router.get("/confirmation/:token", verifyEmailToken);
router.post("/logout", verifyToken, logout)
router.post("/forgotpassword", forgotPassword);
router.post("/verifyotp", verifyOTP);
router.post("/setpassword", setPassword);


module.exports = router