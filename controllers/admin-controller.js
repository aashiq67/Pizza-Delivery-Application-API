require('dotenv').config()
const Admin = require('../model/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { mailTransport, generateOTP } = require('./functions');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const MAILTRAP_ADMINNAME = process.env.MAILTRAP_ADMINNAME;
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET;
const VERIFY_OTP_SECRET = process.env.VERIFY_OTP_SECRET;

// SIGNUP
const signup = async (req, res, next) => {
    
    const { name, email, password } = req.body;
    
    let existingAdmin;
    try {
        existingAdmin = await Admin.findOne({ email: email });
    } catch (err) {
        console.log(err);
    }

    if (existingAdmin) {
        return res.status(400).json({ message: "Admin already exists! Login Instead" })
    }

    const hashedPassword = bcrypt.hashSync(password)
    const admin = new Admin({
        name,
        email,
        password: hashedPassword,
        verified: false
    });
    
    //EMAIL SENDING
    const token = jwt.sign({email:email}, VERIFICATION_SECRET, {
        expiresIn: '10m'
    });
    
    const url = `http://localhost:5000/admin/confirmation/${token}`;
    await mailTransport().sendMail({
        from: MAILTRAP_ADMINNAME,
        to: email,
        subject: "Verify your email account",
        html: `<a href="${url}">${url}</a>`
    });
    
    try {
        await admin.save();
    } catch (err) {
        console.log(err);
    }

    return res.status(201).json({ message: admin });
}

// LOGIN
const login = async (req, res, next) => {
    const { email, password } = req.body;
    let existingAdmin;
    try {
        existingAdmin = await Admin.findOne({ email: email });
    } catch (err) {
        console.log(err);
    }

    if (!existingAdmin) {
        return res.status(400).json({ message: "Invalid Email." })
    }

    const isPasswordCrt = await bcrypt.compare(password, existingAdmin.password);
    if (!isPasswordCrt) {
        return res.status(400).json({ message: "Invalid Password." })
    }

    if(existingAdmin.verified===false){
        return res.status(400).json({message: "Verify your account"})
    }

    const token = jwt.sign({ id: existingAdmin._id }, JWT_SECRET_KEY, {
        expiresIn: '1205s'
    });
    
    if (typeof (req.headers.cookie) !== 'undefined'){
        if(req.headers.cookie[`${existingAdmin._id}`]) {
            req.headers.cookie[`${existingAdmin._id}`] = "";
        }
    }
    
    res.cookie(String(existingAdmin._id), token, {
        path: "/",
        expiresIn: new Date(Date.now() + 1000 * 30),
        httpOnly: true,
        sameSite: 'lax'
    })

    return res.status(200).json({ message: "Successfully Logged In", admin: existingAdmin, token })
}

// DASHBOARD
const verifyToken = (req, res, next) => {
    const cookiesStr = req.headers.cookie;
    if(cookiesStr === undefined){
        return res.status(400).json({message: "Cookie not found"});
    }
    const cookiesList = cookiesStr.split(" ");
    const token = cookiesList[0].split("=")[1];
    
    if (!token) {
        res.status(400).json({ message: "No token found" });
    }
    jwt.verify(String(token), JWT_SECRET_KEY, (err, admin) => {
        if (err) {
            return res.status(400).json({ message: 'Invalid Token' });
        }
        console.log("admin details", admin);
        req.id = admin.id;
    });
    next();
}

const getAdmin = async (req, res, next) => {
    const adminId = req.id;
    let admin;
    try {
        admin = await Admin.findById(adminId, "-password"); // removes the password and gives all the data
    } catch (err) {
        return new Error(err);
    }

    if (!admin) {
        return res.status(404).json({ message: "Admin not found" })
    }
    return res.status(200).json({ admin: admin })
}

const refreshToken = (req, res, next) => {
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const prevToken = cookiesList[0].split("=")[1];
    
    if (!prevToken) {
        return res.status(400).json({ message: "Token not found" })
    }
    jwt.verify(String(prevToken), JWT_SECRET_KEY, (err, admin) => {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: "Authentication failed" })
        }
        res.clearCookie(`${admin.id}`);
        req.headers[`${admin.id}`] = "";

        const token = jwt.sign({ id: admin.id }, JWT_SECRET_KEY, {
            expiresIn: '1205s'
        });
        
        console.log("Regenerated token = ", token);

        res.cookie(String(admin.id), token, {
            path: "/",
            expiresIn: new Date(Date.now() + 1000 * 30),
            httpOnly: true,
            sameSite: 'lax'
        });

        req.id = admin.id;
        next();

    })
}

// VERIFY EMAIL TOKEN
const verifyEmailToken = async (req, res, next) => {
    const token = req.params.token;
    jwt.verify(String(token), VERIFICATION_SECRET, async (err, admin)=>{
        if(err) {
            console.log(err);
            return res.status(400).json({message: "Invalid Token"});
        }
        let response
        try{
            response = await Admin.findOne({email: admin.email});
            await Admin.updateOne({email: admin.email}, {verified: true});
            return res.redirect("http://localhost:3000/admin/auth");
        } catch(err){
            console.log(err);
            return res.status(400).json({message: "invalid admin"});
        }
    })
}

// LOGOUT
const logout = (req, res, next) =>{
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const token = cookiesList[0].split("=")[1];

    jwt.verify(String(token), JWT_SECRET_KEY, (err, admin) => {
        if (err) {
            console.log(err);
            return res.status(403).json({ message: "Authentication failed" })
        }
        res.clearCookie(`${admin.id}`);
        // req.headers[`${admin.id}`] = "";
        return res.status(200).json({message: "Successfully Logged Out"})
    })
}

// FORGOT PASSWORD
const forgotPassword = async (req, res, next) =>{
    const email = req.body.email;
    console.log("in fp");
    try{
        await Admin.findOne({email: email});
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
        from: MAILTRAP_ADMINNAME,
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

    jwt.verify(String(OTP_token), VERIFY_OTP_SECRET, (err, admin)=>{
        if(err){
            console.log(err);
            return res.status(400).json({message: "Invalid OTP token"})
        }
        console.log(admin.OTP, receivedOTP);
        if(admin.OTP == receivedOTP){
            return res.status(200).json({message: "verified", verified: true})
        }
        return res.status(400).json({message: "verified", verified: false})
    })
}

const setPassword = async (req, res, next)=>{
    const cookiesStr = req.headers.cookie;
    const cookiesList = cookiesStr.split(" ");
    const email = cookiesList[cookiesList.length-1].split("=")[0];
    console.log("email ="+String(email)+"=");
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    console.log("password = ", req.body.password);
    console.log("new hashed password = ", hashedPassword);
    res.clearCookie(`${email}`);
    try{
        await Admin.updateOne({email: email}, {password: hashedPassword})
        return res.status(200).json({message: "Successfully password set"})
    } catch(err){
        console.log(err);
        return res.status(400).json({message: "email not found"})
    }
}



exports.signup = signup;
exports.login = login;
exports.verifyToken = verifyToken;
exports.getAdmin = getAdmin;
exports.refreshToken = refreshToken;
exports.verifyEmailToken = verifyEmailToken;
exports.logout = logout;
exports.forgotPassword = forgotPassword;
exports.verifyOTP = verifyOTP;
exports.setPassword = setPassword;