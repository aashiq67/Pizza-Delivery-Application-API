require('dotenv').config();
const nodemailer = require('nodemailer');
const MAILTRAP_USERNAME = process.env.MAILTRAP_USERNAME;
const MAILTRAP_PASSWORD = process.env.MAILTRAP_PASSWORD;

const mailTransport = () => nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: MAILTRAP_USERNAME,
        pass: MAILTRAP_PASSWORD
    }
});

const generateOTP = ()=>{
    const OTP = Math.floor(100000 + Math.random() * 900000)
    console.log(OTP);
    return OTP;
}

exports.mailTransport = mailTransport;
exports.generateOTP = generateOTP;