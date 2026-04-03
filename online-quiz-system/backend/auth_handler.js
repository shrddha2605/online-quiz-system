const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE || "QuizUsers";

const generateResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    },
    body: JSON.stringify(body)
  };
};

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  try {
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};

    if (httpMethod === "POST" && path.includes("/register")) {
      const { email, password, username, role = "user" } = requestBody;
      
      if (!email || !password || !username) {
        return generateResponse(400, { message: "Email, password, and username are required." });
      }

      // Check if user exists
      const getRes = await dynamo.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: email }
      }));

      if (getRes.Item) {
        return generateResponse(400, { message: "User already exists with this email." });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      await dynamo.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          userId: email,
          username,
          passwordHash,
          role,
          createdAt: new Date().toISOString()
        }
      }));

      return generateResponse(201, { message: "User registered successfully", user: { email, username, role } });
    }

    if (httpMethod === "POST" && path.includes("/login")) {
      const { email, password } = requestBody;

      if (!email || !password) {
        return generateResponse(400, { message: "Email and password are required." });
      }

      const getRes = await dynamo.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: email }
      }));

      if (!getRes.Item) {
        return generateResponse(401, { message: "Invalid email or password." });
      }

      const user = getRes.Item;
      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
         return generateResponse(401, { message: "Invalid email or password." });
      }

      // In a real app we'd sign a JWT here. For this serverless demo without secrets manager, 
      // we'll return a simple token/identifier.
      const token = Buffer.from(`${user.userId}:${user.role}`).toString('base64');

      return generateResponse(200, { 
        message: "Login successful", 
        token, 
        user: { email: user.userId, username: user.username, role: user.role } 
      });
    }

    return generateResponse(404, { message: "Not found" });
  } catch (error) {
    console.error("Auth Error:", error);
    return generateResponse(500, { message: "Internal server error" });
  }
};
