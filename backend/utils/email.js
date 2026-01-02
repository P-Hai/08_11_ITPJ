// utils/email.js - COMPLETE VERSION
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({
  region: process.env.REGION || "ap-southeast-1",
});

/**
 * Send OTP email for MFA
 */
const sendOTPEmail = async (toEmail, otp, userName) => {
  try {
    const params = {
      Source: process.env.SES_FROM_EMAIL || "phuchai5904@gmail.com",
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: "Your OTP Code for EHR System",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .otp-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px dashed #667eea; }
    .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: monospace; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 OTP Verification</h1>
      <p>Electronic Health Records System</p>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>Your One-Time Password (OTP) for login verification is:</p>
      <div class="otp-box">
        <p class="otp-code">${otp}</p>
      </div>
      <div class="warning">
        <p><strong>⏰ This code will expire in 5 minutes</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
      <p>For security reasons, never share this code with anyone.</p>
      <p>Best regards,<br><strong>EHR System Team</strong></p>
    </div>
  </div>
</body>
</html>
            `,
            Charset: "UTF-8",
          },
          Text: {
            Data: `
Hello ${userName},

Your OTP code for EHR System login: ${otp}

This code will expire in 5 minutes.
If you didn't request this, please ignore this email.

Best regards,
EHR System Team
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log("✅ OTP email sent:", response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

/**
 * Send patient credentials email after account creation
 */
const sendPatientCredentialsEmail = async (
  toEmail,
  patientName,
  username,
  password
) => {
  try {
    const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const params = {
      Source: process.env.SES_FROM_EMAIL || "phuchai5904@gmail.com",
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: "Welcome to EHR System - Your Patient Portal Access",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 10px 10px 0 0; 
    }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { 
      background: white; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border-left: 4px solid #667eea; 
    }
    .credential-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 10px 0; 
      border-bottom: 1px solid #eee; 
    }
    .credential-label { 
      font-weight: bold; 
      color: #666; 
    }
    .credential-value { 
      font-size: 18px; 
      font-weight: bold; 
      color: #667eea; 
      font-family: monospace; 
    }
    .warning { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px; 
    }
    .features { 
      background: #e8f5e9; 
      border-left: 4px solid #4caf50; 
      padding: 15px; 
      margin: 20px 0; 
      border-radius: 4px; 
    }
    .features ul { margin: 10px 0; padding-left: 20px; }
    .features li { margin: 5px 0; }
    .btn { 
      display: inline-block; 
      background: #667eea; 
      color: white !important; 
      padding: 12px 30px; 
      text-decoration: none; 
      border-radius: 5px; 
      margin: 20px 0; 
      font-weight: bold; 
    }
    .footer { 
      text-align: center; 
      padding: 20px; 
      color: #666; 
      font-size: 12px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Welcome to EHR System</h1>
      <p>Your Patient Portal is Ready</p>
    </div>
    <div class="content">
      <p>Dear <strong>${patientName}</strong>,</p>
      
      <p>Your patient account has been successfully created. You can now access your medical records and health information through our secure patient portal.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0; color: #667eea;">🔑 Your Login Credentials</h3>
        <div class="credential-row">
          <span class="credential-label">Username:</span>
          <span class="credential-value">${username}</span>
        </div>
        <div class="credential-row" style="border-bottom: none;">
          <span class="credential-label">Temporary Password:</span>
          <span class="credential-value">${password}</span>
        </div>
      </div>
      
      <div class="warning">
        <p style="margin: 0;"><strong>⚠️ Important Security Notice:</strong></p>
        <ul style="margin: 10px 0;">
          <li>This is a <strong>temporary password</strong></li>
          <li>You will be required to <strong>change it on first login</strong></li>
          <li>Never share your credentials with anyone</li>
          <li>Use a strong, unique password</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn">Login to Patient Portal</a>
      </div>
      
      <div class="features">
        <p style="margin-top: 0;"><strong>✨ What You Can Do:</strong></p>
        <ul>
          <li>📋 View your medical records and history</li>
          <li>💊 Check your prescriptions and medications</li>
          <li>📊 Monitor your vital signs and lab results</li>
          <li>📝 Update your contact information</li>
          <li>🔔 Receive important health notifications</li>
        </ul>
      </div>
      
      <p><strong>Need Help?</strong><br>
      If you have any questions or need assistance, please contact our clinic reception or call our support line.</p>
      
      <p>We're here to help you manage your health better!</p>
      
      <p>Best regards,<br>
      <strong>EHR System Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} EHR System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
            `,
            Charset: "UTF-8",
          },
          Text: {
            Data: `
Welcome to EHR System - Patient Portal

Dear ${patientName},

Your patient account has been successfully created!

LOGIN CREDENTIALS:
Username: ${username}
Temporary Password: ${password}

⚠️ IMPORTANT:
- This is a temporary password
- You must change it on first login
- Never share your credentials

LOGIN URL: ${loginUrl}

WHAT YOU CAN DO:
✅ View your medical records
✅ Check prescriptions
✅ Monitor vital signs
✅ Update contact info

Need help? Contact clinic reception.

Best regards,
EHR System Team

---
This is an automated message. Please do not reply.
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log("✅ Patient credentials email sent:", response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (toEmail, userName, resetLink) => {
  try {
    const params = {
      Source: process.env.SES_FROM_EMAIL || "phuchai5904@gmail.com",
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: "Password Reset Request - EHR System",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .btn { display: inline-block; background: #667eea; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
      <p>EHR System</p>
    </div>
    <div class="content">
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="btn">Reset Password</a>
      </div>
      <div class="warning">
        <p><strong>⏰ This link will expire in 1 hour</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
      <p>Best regards,<br><strong>EHR System Team</strong></p>
    </div>
  </div>
</body>
</html>
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log("✅ Password reset email sent:", response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendPatientCredentialsEmail,
  sendPasswordResetEmail,
};
