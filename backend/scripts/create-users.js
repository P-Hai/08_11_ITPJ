import AWS from "aws-sdk";
import dotenv from "dotenv";
dotenv.config();
console.log("✅ ENV CHECK:", {
  REGION: process.env.REGION,
  USER_POOL_ID: process.env.USER_POOL_ID,
  CLIENT_ID: process.env.CLIENT_ID,
  DATABASE_URL: process.env.DATABASE_URL?.slice(0, 50) + "...", // ẩn bớt
});

// Cấu hình AWS Cognito
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION,
});

const USER_POOL_ID = process.env.USER_POOL_ID;

// Danh sách users cần tạo
const users = [
  {
    username: "DOC002",
    name: "Dr. Jane Doe",
    email: "doctor.jane@clinic.local",
    role: "doctor",
    department: "Pediatrics",
    group: "Doctors",
  },
  {
    username: "NUR002",
    name: "Lisa White",
    email: "nurse.lisa@clinic.local",
    role: "nurse",
    department: "Emergency",
    group: "Nurses",
  },
];

// Hàm tạo user
async function createUser(user) {
  try {
    // 1️⃣ Tạo user trong Cognito
    const params = {
      UserPoolId: USER_POOL_ID,
      Username: user.username,
      TemporaryPassword: "TempPass@2025!",
      MessageAction: "SUPPRESS", // Không gửi email mời tự động
      UserAttributes: [
        { Name: "email", Value: user.email },
        { Name: "email_verified", Value: "true" },
        { Name: "name", Value: user.name },
        { Name: "custom:role", Value: user.role },
        { Name: "custom:employee_id", Value: user.username },
        { Name: "custom:department", Value: user.department },
      ],
    };

    await cognito.adminCreateUser(params).promise();
    console.log(`✅ Created user: ${user.username}`);

    // 2️⃣ Thêm user vào nhóm
    await cognito
      .adminAddUserToGroup({
        UserPoolId: USER_POOL_ID,
        Username: user.username,
        GroupName: user.group,
      })
      .promise();

    console.log(`✅ Added ${user.username} to ${user.group}`);
  } catch (error) {
    console.error(`❌ Error creating ${user.username}:`, error.message);
  }
}

async function main() {
  console.log("🚀 Starting user creation...");
  for (const user of users) {
    await createUser(user);
  }
  console.log("🎉 Done!");
}

main();
