const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(toEmail, token) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const heroImage = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80';

    const mailOptions = {
        from: `"AUTOUSATA" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Start your engine! Verify your AUTOUSATA account',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify AUTOUSATA Account</title>
            <style>
                body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; color: #111827; }
                .wrapper { padding: 40px 0; width: 100%; }
                .container { background-color: #ffffff; margin: 0 auto; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .logo-bar { background-color: #111827; padding: 20px; text-align: center; }
                .logo-text { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; }
                .header-image { width: 100%; height: 200px; object-fit: cover; display: block; background-color: #111; }
                .content { padding: 36px 40px; text-align: center; }
                h1 { font-size: 24px; font-weight: 800; margin: 0 0 12px 0; color: #111827; }
                p { font-size: 15px; line-height: 1.6; color: #4b5563; margin: 0 0 22px 0; }
                .btn { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 999px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); }
                .note { font-size: 12px; color: #9ca3af; margin-top: 18px; }
                .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-bar"><span class="logo-text">AUTOUSATA</span></div>
                    <img src="${heroImage}" class="header-image" alt="Luxury Car">
                    <div class="content">
                        <h1>You are almost in the driver's seat.</h1>
                        <p>Welcome to AUTOUSATA. Verify your email to start bidding on exclusive vehicles and access full inspection reports.</p>
                        <a href="${verificationLink}" class="btn">Verify My Email</a>
                        <p class="note">This link expires in 24 hours. If you did not request this, you can safely ignore it.</p>
                    </div>
                    <div class="footer">&copy; ${new Date().getFullYear()} AUTOUSATA Inc.</div>
                </div>
            </div>
        </body>
        </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('Email error:', error);
        return false;
    }
}

module.exports = { sendVerificationEmail };
