// scripts/create-cognito-group.js
const AWS = require("aws-sdk");
require("dotenv").config();

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION || "ap-southeast-1",
});

async function createPatientsGroup() {
  try {
    console.log("🔧 Creating Patients group in Cognito User Pool...\n");

    const userPoolId = process.env.USER_POOL_ID;

    // Check if group already exists
    try {
      const existingGroups = await cognito
        .listGroups({
          UserPoolId: userPoolId,
        })
        .promise();

      const patientsGroup = existingGroups.Groups.find(
        (group) => group.GroupName === "Patients"
      );

      if (patientsGroup) {
        console.log("✅ Patients group already exists");
        console.log("Group details:", JSON.stringify(patientsGroup, null, 2));
        return;
      }
    } catch (err) {
      console.log("Checking existing groups...");
    }

    // Create the group
    const params = {
      GroupName: "Patients",
      UserPoolId: userPoolId,
      Description:
        "Patient users with limited access to view their own medical records",
      Precedence: 3, // Lower number = higher priority (1=highest)
    };

    const result = await cognito.createGroup(params).promise();

    console.log("✅ Patients group created successfully!");
    console.log("\nGroup details:");
    console.log(JSON.stringify(result.Group, null, 2));

    // Verify by listing all groups
    console.log("\n📋 All groups in User Pool:");
    const allGroups = await cognito
      .listGroups({
        UserPoolId: userPoolId,
      })
      .promise();

    console.table(
      allGroups.Groups.map((g) => ({
        Name: g.GroupName,
        Description: g.Description,
        Precedence: g.Precedence,
        CreatedDate: g.CreationDate,
      }))
    );

    console.log("\n✅ Setup completed!");
  } catch (error) {
    console.error("❌ Error creating Patients group:", error.message);
    console.error(error);
  }
}

// Run the script
createPatientsGroup();
