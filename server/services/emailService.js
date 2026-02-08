const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- CONFIGURATION ---
const FRONTEND_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Premium Styles (Dark Mode & Gold)
const STYLES = `
    body { background-color: #0F172A; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; padding: 40px 0; background-color: #0F172A; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .hero { width: 100%; height: auto; display: block; border-bottom: 4px solid #D4AF37; }
    .content { padding: 48px 40px; text-align: center; }
    .logo { color: #FFFFFF; font-size: 20px; letter-spacing: 4px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; display: inline-block; }
    h1 { color: #FFFFFF; font-size: 28px; font-weight: 700; margin: 24px 0 16px; line-height: 1.3; }
    p { color: #94A3B8; font-size: 16px; line-height: 1.7; margin-bottom: 32px; }
    
    /* OTP Box Style */
    .otp-box { background: rgba(212, 175, 55, 0.1); border: 1px dashed #D4AF37; color: #D4AF37; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 24px; border-radius: 12px; display: inline-block; margin-bottom: 24px; }
    
    /* Button Style */
    .btn { background: linear-gradient(135deg, #D4AF37 0%, #B5952F 100%); color: #000000 !important; text-decoration: none; padding: 16px 40px; font-size: 16px; font-weight: 800; border-radius: 50px; display: inline-block; box-shadow: 0 10px 20px rgba(212, 175, 55, 0.2); transition: all 0.3s ease; }
    
    .footer { padding: 30px; background-color: #0B1120; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1E293B; }
    .link { color: #D4AF37; text-decoration: none; }
`;

async function sendEmail(to, subject, html) {
    try {
        await transporter.sendMail({ from: `"AUTOUSATA Concierge" <${process.env.EMAIL_USER}>`, to, subject, html });
        console.log(`✨ Premium Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email Error:', error);
        return false;
    }
}

// ==========================================
// 1. Verification Email (The "Driver's Seat" Vibe)
// ==========================================
async function sendVerificationEmail(toEmail, otp) {
    // Image: Audi R8 / Sleek Dark Interior (Reliable 600px URL)
    const heroImage = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600&auto=format&fit=crop';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${STYLES}</style></head>
    <body>
        <div class="wrapper">
            <div class="container">
                <img src="${heroImage}" class="hero" alt="Luxury Car Interior" width="600">
                <div class="content">
                    <div class="logo">AUTOUSATA</div>
                    <h1>You are one step away from the driver's seat.</h1>
                    <p>Welcome to the inner circle. To activate your access to exclusive auctions and listings, please verify your identity using the secure code below.</p>
                    
                    <div class="otp-box">${otp}</div>
                    
                    <p style="font-size: 12px; color: #64748B;">This code is valid for 15 minutes. For your security, do not share it.</p>
                </div>
                <div class="footer">&copy; ${new Date().getFullYear()} Autousata Inc. All rights reserved.</div>
            </div>
        </div>
    </body>
    </html>`;

    return sendEmail(toEmail, 'Verify Your Access | AUTOUSATA', html);
}

// ==========================================
// 2. Reset Password Email (The "Key Fob" Vibe)
// ==========================================
async function sendPasswordResetEmail(toEmail, token) {
    // Image: Aggressive Mustang / Muscle Car in Dark (Reliable 600px URL)
    const heroImage = 'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=600&auto=format&fit=crop';
    
    // NOTE: '#/' ensures HashRouter picks it up correctly
    const resetLink = `${FRONTEND_URL}/#/reset-password?token=${token}`; 

    const html = `
    <!DOCTYPE html>
    <html>
    <head><style>${STYLES}</style></head>
    <body>
        <div class="wrapper">
            <div class="container">
                <img src="${heroImage}" class="hero" alt="Performance Vehicle" width="600">
                <div class="content">
                    <div class="logo">AUTOUSATA</div>
                    <h1>It's time to get back behind the wheel.</h1>
                    <p>We received a request to reset your access credentials. Click the button below to secure your account and return to the marketplace.</p>
                    
                    <a href="${resetLink}" class="btn">Reset My Password</a>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #64748B;">
                        Or copy this link: <a href="${resetLink}" class="link">${resetLink}</a>
                    </p>
                </div>
                <div class="footer">&copy; ${new Date().getFullYear()} Autousata Inc. All rights reserved.</div>
            </div>
        </div>
    </body>
    </html>`;

    return sendEmail(toEmail, 'Secure Password Reset | AUTOUSATA', html);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };