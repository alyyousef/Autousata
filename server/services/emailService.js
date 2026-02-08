const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(toEmail, otpCode) {
    // High-End Porsche Interior Image
// A reliable, fast-loading luxury car image
const heroImage = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80';
    const mailOptions = {
        from: `"AUTOUSATA Concierge" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: '🔒 Your Access Code: ' + otpCode,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e2e8f0; }
                .wrapper { width: 100%; padding: 40px 0; background-color: #0f172a; }
                .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #334155; }
                
                /* Header */
                .header-img { width: 100%; height: 240px; object-fit: cover; display: block; }
                .logo-bar { background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 1px solid #334155; }
                .logo-text { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: 6px; text-transform: uppercase; }
                
                /* Content */
                .content { padding: 40px; text-align: center; }
                h1 { color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; letter-spacing: -0.5px; }
                p { font-size: 16px; line-height: 1.6; color: #94a3b8; margin: 0 0 30px 0; }
                
                /* OTP Box - The Star of the Show */
                .otp-wrapper { margin: 30px 0; }
                .otp-code { 
                    font-family: 'Courier New', monospace;
                    font-size: 42px; 
                    font-weight: 700; 
                    color: #ffffff; 
                    background: #334155; 
                    padding: 20px 40px; 
                    border-radius: 8px; 
                    letter-spacing: 12px; 
                    display: inline-block;
                    border: 1px solid #475569;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
                }
                
                /* Footer */
                .footer { background-color: #0f172a; padding: 30px; text-align: center; border-top: 1px solid #334155; }
                .footer p { font-size: 12px; color: #64748b; margin: 0; }
                .accent { color: #6366f1; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-bar">
                        <span class="logo-text">AUTOUSATA</span>
                    </div>
                    
                    <img src="${heroImage}" class="header-img" alt="Luxury Interior">
                    
                    <div class="content">
                        <h1>Start Your Engine</h1>
                        <p>You are seconds away from accessing the world's most curated marketplace. Use the secure code below to verify your identity.</p>
                        
                        <div class="otp-wrapper">
                            <div class="otp-code">${otpCode}</div>
                        </div>
                        
                        <p>This code is valid for <span class="accent">15 minutes</span>.<br>For your security, do not share this code.</p>
                    </div>
                    
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} AUTOUSATA Inc. • Cairo, Egypt</p>
                        <p style="margin-top: 10px;">Driven by passion. Verified by us.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Premium OTP sent to ${toEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
}

module.exports = { sendVerificationEmail };