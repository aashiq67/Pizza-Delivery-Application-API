require('dotenv').config()
const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const { mailTransport, generateOTP } = require('./functions');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const MAILTRAP_USERNAME = process.env.MAILTRAP_USERNAME;
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET;
const VERIFY_OTP_SECRET = process.env.VERIFY_OTP_SECRET;
const KEY_ID = process.env.KEY_ID;
const KEY_SECRET = process.env.KEY_SECRET;

const signup = async (req, res, next) => {
    
    const { name, email, password } = req.body;
    
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        console.log(err);
    }

    if (existingUser) {
        return res.status(400).json({ message: "User already exists! Login Instead" })
    }

    const hashedPassword = bcrypt.hashSync(password)
    const user = new User({
        name,
        email,
        password: hashedPassword,
        verified: false
    });
    
    //EMAIL SENDING
    const token = jwt.sign({email:email}, VERIFICATION_SECRET, {
        expiresIn: '10m'
    });
    
    const url = `http://localhost:5000/user/confirmation/${token}`;
    await mailTransport().sendMail({
        from: MAILTRAP_USERNAME,
        to: email,
        subject: "Verify your email account",
        html: `<a href="${url}">${url}</a>`
    });
    
    try {
        await user.save();
    } catch (err) {
        console.log(err);
    }

    return res.status(201).json({ message: user });
}

const login = async (req, res, next) => {
    console.log("LOGIN REQUEST RECEIVED");
    const { email, password } = req.body;
    console.log("LOGIN DETAILS", email, password);
    let existingUser;
    try {
        existingUser = await User.findOne({ email: email });
    } catch (err) {
        console.log(err);
    }

    if (!existingUser) {
        return res.status(400).json({ message: "Invalid Email." })
    }

    const isPasswordCrt = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCrt) {
        return res.status(400).json({ message: "Invalid Password." })
    }

    if(existingUser.verified===false){
        return res.status(400).json({message: "Verify your account"})
    }

    const token = jwt.sign({ id: existingUser._id }, JWT_SECRET_KEY, {
        expiresIn: '1205s'
    });
    console.log("TOKEN GENERATEED", token);
    if (typeof (req.headers.cookie) !== 'undefined'){
        if(req.headers.cookie[`${existingUser._id}`]) {
            req.headers.cookie[`${existingUser._id}`] = "";
        }
    }
    
    res.cookie(String(existingUser._id), token, {
        path: "/",
        expiresIn: new Date(Date.now() + 1000 * 30),
        httpOnly: true,
        sameSite: 'lax'
    })
    console.log("COOKIE SET SUCCESFULLY\n\n");
    return res.status(200).json({ message: "Successfully Logged In", user: existingUser, token })
}

const verifyToken = (req, res, next) => {
    console.log("verifyToken");
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const token = cookiesList[0].split("=")[1];
    
    if (!token) {
        console.log("NO TOKEN FOUND IN COOKIE", token);
        res.status(400).json({ message: "No token found" });
    }
    console.log("TOKEN FOUND IN COOKIE", token);
    console.log("VERIFYING TOKEN...");
    jwt.verify(String(token), JWT_SECRET_KEY, (err, user) => {
        if (err) {
            console.log("TOKEN DOESNOT MATCH WITH THE SECRET KEY");
            return res.status(400).json({ message: 'Invalid Token' });
        }
        console.log("TOKEN VERIFIED SUCCESSFULLY\n\n");
        req.id = user.id;
    });
    next();
}

const getUser = async (req, res, next) => {
    console.log("getUser");
    const userId = req.id;
    let user;
    try {
        user = await User.findById(userId, "-password"); // removes the password and gives all the data
    } catch (err) {
        return new Error(err);
    }
    
    if (!user) {
        console.log("USER NOT FOUND");
        return res.status(404).json({ message: "User not found" })
    }
    console.log("USER FOUND\n\n");
    return res.status(200).json({ user: user })
}

const refreshToken = (req, res, next) => {4
    console.log("refreshToken");
    console.log("FINDING FOR THE TOKEN IN THE COOKIE");
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const prevToken = cookiesList[0].split("=")[1];
    
    if (!prevToken) {
        console.log("TOKEN NOT FOUND");
        return res.status(400).json({ message: "Token not found" })
    }
    console.log("TOKEN FOUND", prevToken);
    console.log("VERIFYING TOKEN...");
    jwt.verify(String(prevToken), JWT_SECRET_KEY, (err, user) => {
        if (err) {
            console.log(err);
            console.log("TOKEN DOESNOT MATCH WITH THE SECRET KEY");
            return res.status(403).json({ message: "Authentication failed" })
        }
        console.log("COOKIE IN HEADERS BEFORE CLEARING", req.headers);
        console.log("CLEARING THE COOKIE");
        res.clearCookie(`${user.id}`);
        req.headers[`${user.id}`] = "";
        console.log("COOKIE IN HEADERS AFTER CLEARING", req.headers);

        const token = jwt.sign({ id: user.id }, JWT_SECRET_KEY, {
            expiresIn: '1205s'
        });
        
        console.log("REGENERATED NEW TOKEN = ", token);
        console.log("SETTING THE NEW TOKEN IN THE COOKIE");
        res.cookie(String(user.id), token, {
            path: "/",
            expiresIn: new Date(Date.now() + 1000 * 30),
            httpOnly: true,
            sameSite: 'lax'
        });
        console.log("COOKIE IN HEADERS AFTER SETTING", req.headers);
        req.id = user.id;
        next();

    })
}

const verifyEmailToken = async (req, res, next) => {
    const token = req.params.token;
    jwt.verify(String(token), VERIFICATION_SECRET, async (err, user)=>{
        if(err) {
            console.log(err);
            return res.status(400).json({message: "Invalid Token"});
        }
        let response
        try{
            response = await User.findOne({email: user.email});
            await User.updateOne({email: user.email}, {verified: true});
            return res.redirect("http://localhost:3000/user/auth");
        } catch(err){
            console.log(err);
            return res.status(400).json({message: "invalid user"});
        }
    })
}

const logout = (req, res, next) =>{
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const token = cookiesList[0].split("=")[1];

    jwt.verify(String(token), JWT_SECRET_KEY, (err, user) => {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: "Authentication failed" })
        }
        res.clearCookie(`${user.id}`);
        req.headers[`${user.id}`] = "";
        return res.status(200).json({message: "Successfully Logged Out"})
    })
}

const forgotPassword = async (req, res, next) =>{
    const email = req.body.email;
    console.log("in fp");
    try{
        await User.findOne({email: email});
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "Invalid email"});
    }

    const OTP = generateOTP();
    const OTP_token = jwt.sign({OTP: OTP}, VERIFY_OTP_SECRET, {
        expiresIn: '10m'
    })
    
    res.cookie(String(email), OTP_token, {
        path: "/",
        expiresIn: new Date(Date.now() + 1000 * 600),
        httpOnly: true,
        sameSite: 'lax'
    });
    
    console.log("sending OTP");
    await mailTransport().sendMail({
        from: MAILTRAP_USERNAME,
        to: email,
        subject: "Forgot Password OTP",
        html: `<h1>${OTP}</h1>`
    });
    console.log("OTP sent");
    return res.status(200).json({message: "OTP sent"})
}

const verifyOTP = (req, res, next) => {
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const OTP_token = cookiesList[cookiesList.length-1].split("=")[1];

    const receivedOTP = req.body.OTP;

    jwt.verify(String(OTP_token), VERIFY_OTP_SECRET, (err, user)=>{
        if(err){
            console.log(err);
            return res.status(400).json({message: "Invalid OTP token"})
        }
        console.log(user.OTP, receivedOTP);
        if(user.OTP == receivedOTP){
            return res.status(200).json({message: "verified", verified: true})
        }
        return res.status(400).json({message: "verified", verified: false})
    })
}

const setPassword = async (req, res, next)=>{
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const email = cookiesList[cookiesList.length-1].split("=")[0];
    
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    res.clearCookie(`${email}`);
    try{
        await User.updateOne({email: email}, {password: hashedPassword})
        return res.status(200).json({message: "Successfully password set"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "email not found"})
    }
}

const addLike = async (req, res, next) => {
    console.log(req.body);
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const user_id = cookiesList[0].split("=")[0];
    console.log("user_id = ", user_id);

    try{
        await User.updateOne({_id: user_id}, {$push:{"likes": req.body.id}})
        return res.status(200).json({message: "liked successfuly"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const removeLike = async (req, res, next) => {
    console.log(req.body);
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const user_id = cookiesList[0].split("=")[0];
    console.log("user_id = ", user_id);

    try{
        await User.updateOne({_id: user_id}, {$pull:{"likes": req.body.id}})
        return res.status(200).json({message: "unliked successfuly"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const addCart = async (req, res, next) => {
    console.log(req.body);
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const user_id = cookiesList[0].split("=")[0];
    console.log("user_id = ", user_id);

    try{
        await User.updateOne({_id: user_id}, {$push:{"cart": req.body.id}})
        return res.status(200).json({message: "added to cart successfuly"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const removeCart = async (req, res, next) => {
    console.log(req.body);
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const user_id = cookiesList[0].split("=")[0];
    console.log("user_id = ", user_id);

    try{
        await User.updateOne({_id: user_id}, {$pull:{"cart": req.body.id}})
        return res.status(200).json({message: "deleted from cart successfuly"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const getLikes = async (req, res, next) => {
    
    const email = req.body.email;
    console.log(req.body);
    try{
        const user = await User.findOne({email: email});
        console.log(user);
        return res.status(200).json({likes: user.likes})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const getCart = async (req, res, next) => {
    
    const email = req.body.email;
    try{
        const user = await User.findOne({email: email});
        return res.status(200).json({cart: user.cart})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "error"})
    }
}

const payment = async (req, res, next) => {
    var instance = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })
    console.log(req.body);
    try{
        const response = await instance.orders.create({
            amount: req.body.amount*100,
            currency: "INR",
            receipt: "receipt#1",
        });
        return res.status(200).json({message: "order created successfully", order_details: response})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: 'error', error: "unable to create order"})
    }
}

exports.signup = signup;
exports.login = login;
exports.verifyToken = verifyToken;
exports.getUser = getUser;
exports.refreshToken = refreshToken;
exports.verifyEmailToken = verifyEmailToken;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.verifyOTP = verifyOTP;
exports.setPassword = setPassword;
exports.addLike = addLike;
exports.addCart = addCart;
exports.getLikes = getLikes;
exports.removeLike = removeLike;
exports.removeCart = removeCart
exports.getCart = getCart;
exports.payment = payment;