const nodemailer = require('nodemailer');
require('dotenv').config();

// Create the Transporter
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
    
    // Hosted image for the banner (You can replace this URL with one from your S3 bucket later)
    const heroImage = "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80";

    const mailOptions = {
        from: `"AutoUsata" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: '🏁 Start your engine! Verify your AutoUsata account',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify AutoUsata Account</title>
            <style>
                /* Client-specific resets */
                body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
                
                /* Global Styles */
                body {
                    margin: 0; padding: 0;
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    background-color: #f3f4f6;
                    color: #333333;
                }
                .wrapper { width: 100%; table-layout: fixed; padding-bottom: 60px; }
                
                /* Main Card */
                .container {
                    background-color: #ffffff;
                    margin: 0 auto;
                    width: 100%;
                    max-width: 600px;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }

                /* Header */
                .header-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    background-color: #111827;
                }
                .logo-bar {
                    background-color: #111827;
                    padding: 20px;
                    text-align: center;
                }
                .logo-text {
                    color: #ffffff;
                    font-size: 24px;
                    font-weight: 800;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                }

                /* Content */
                .content { padding: 40px 40px; text-align: center; }
                
                h1 {
                    font-size: 28px;
                    font-weight: 800;
                    margin: 0 0 15px 0;
                    color: #111827;
                }
                
                p {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #4b5563;
                    margin: 0 0 25px 0;
                }

                /* The Big Button */
                .btn-container { margin: 35px 0; }
                .btn {
                    background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                    color: #ffffff !important;
                    font-size: 18px;
                    font-weight: 700;
                    text-decoration: none;
                    padding: 18px 45px;
                    border-radius: 50px;
                    display: inline-block;
                    box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                /* Trust Grid */
                .trust-grid {
                    border-top: 1px solid #e5e7eb;
                    padding-top: 30px;
                    margin-top: 30px;
                }
                .trust-item {
                    width: 33%;
                    display: inline-block;
                    vertical-align: top;
                    padding: 0 5px;
                    box-sizing: border-box;
                }
                .trust-icon { font-size: 24px; margin-bottom: 5px; display: block; }
                .trust-title { font-weight: 700; font-size: 14px; color: #111; margin-bottom: 3px; display: block; }
                .trust-desc { font-size: 11px; color: #666; display: block; }

                /* Footer */
                .footer {
                    background-color: #f9fafb;
                    padding: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                }
                .footer a { color: #6b7280; text-decoration: none; margin: 0 5px; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <br>
                <div class="container">
                    
                    <div class="logo-bar">
                        <span class="logo-text">AUTOUSATA</span>
                    </div>

                    <img src="${heroImage}" alt="Luxury Car" class="header-image" style="width:100%; height:200px; object-fit:cover;">

                    <div class="content">
                        <h1>You're almost in the driver's seat.</h1>
                        <p>Welcome to the premium circle of AutoUsata. To start bidding on exclusive vehicles and accessing full inspection reports, we just need to verify it's really you.</p>
                        
                        <div class="btn-container">
                            <a href="${verificationLink}" class="btn">Verify My Email</a>
                        </div>

                        <p style="font-size: 13px; color: #888;">Link expires in 24 hours. If you didn't request this, simply ignore this message.</p>

                        <div class="trust-grid">
                            <div class="trust-item">
                                <span class="trust-icon">🛡️</span>
                                <span class="trust-title">Secure</span>
                                <span class="trust-desc">Verified Bidding</span>
                            </div><div class="trust-item">
                                <span class="trust-icon">⚡</span>
                                <span class="trust-title">Fast</span>
                                <span class="trust-desc">Instant Access</span>
                            </div><div class="trust-item">
                                <span class="trust-icon">💎</span>
                                <span class="trust-title">Premium</span>
                                <span class="trust-desc">Top Vehicles</span>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} AutoUsata Inc.<br>New Cairo, Egypt</p>
                        <p>
                            <a href="#">Privacy Policy</a> • 
                            <a href="#">Terms of Service</a> • 
                            <a href="#">Support</a>
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${toEmail}: ${info.response}`);
        return true;
    } catch (error) {
        console.error("❌ Email Error:", error);
        return false;
    }
}

module.exports = { sendVerificationEmail };