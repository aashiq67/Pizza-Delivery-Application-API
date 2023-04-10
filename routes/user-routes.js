const express = require('express');
const { 
    signup, 
    login, 
    verifyToken, 
    getUser, 
    refreshToken, 
    verifyEmailToken,
    forgotPassword,
    verifyOTP,
    setPassword,
    logout,
    addLike,
    addCart,
    getLikes,
    removeLike,
    removeCart,
    getCart,
    payment
} = require('../controllers/user-controller');

const router = express.Router();

router.post('/signup',signup);
router.post('/login', login);
router.get('/dashboard', verifyToken, getUser);
router.get("/refresh", refreshToken, verifyToken, getUser);
router.get("/confirmation/:token", verifyEmailToken);
router.post("/logout", verifyToken, logout)
router.post("/forgotpassword", forgotPassword);
router.post("/verifyotp", verifyOTP);
router.post("/setpassword", setPassword);
router.post("/addlike", addLike);
router.post("/addcart", addCart);
router.post("/getlikes", getLikes);
router.post("/removelike", removeLike);
router.post("/removecart", removeCart);
router.post("/getcart", getCart);
router.post("/payment", payment);

module.exports = router