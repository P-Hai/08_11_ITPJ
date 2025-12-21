// utils/email.js
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

// Khởi tạo SES Client
const sesClient = new SESClient({
  region: "ap-southeast-1", // Singapore
});

/**
 * Gửi email OTP
 * @param {string} toEmail - Email người nhận
 * @param {string} otp - Mã OTP 6 số
 * @param {string} userName - Tên người dùng
 */
const sendOTPEmail = async (toEmail, otp, userName = "User") => {
  try {
    const params = {
      Source: "phuchai5904@gmail.com",
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: "🔐 EHR System - Login Verification Code",
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 EHR System</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Login Verification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${userName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                You have requested to login to the EHR System. Please use the following verification code:
              </p>
              
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <div style="background: #f9fafb; border: 2px dashed #667eea; border-radius: 12px; padding: 30px; display: inline-block;">
                      <div style="font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Security Notice:</strong><br>
                  • This code expires in <strong>5 minutes</strong><br>
                  • Never share this code with anyone<br>
                  • If you didn't request this, please ignore this email
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If the code doesn't work, you can request a new one from the login page.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.6;">
                This is an automated message from EHR System<br>
                Ton Duc Thang University - Graduation Project 2025<br>
                <em>Please do not reply to this email</em>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
            Charset: "UTF-8",
          },
          Text: {
            Data: `
EHR System - Login Verification

Hello ${userName},

Your verification code is: ${otp}

This code expires in 5 minutes.
Never share this code with anyone.

If you didn't request this, please ignore this email.

---
EHR System - Ton Duc Thang University
            `,
            Charset: "UTF-8",
          },
        },
      },
    };

    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);

    console.log("✅ Email sent successfully:", response.MessageId);
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
};
