const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE || "QuizUsers";
const QUIZZES_TABLE = process.env.QUIZZES_TABLE || "Quizzes";
const ATTEMPTS_TABLE = process.env.ATTEMPTS_TABLE || "QuizAttempts";

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

const verifyToken = (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [userId, role] = decoded.split(":");
    return { userId, role };
  } catch(e) {
    return null;
  }
};

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event));
  try {
    const { httpMethod, path, body, queryStringParameters } = event;
    const user = verifyToken(event);
    
    if (!user) {
        return generateResponse(401, { message: "Unauthorized." });
    }

    // POST /attempts (Submit new attempt)
    if (httpMethod === "POST") {
       const { quizId, userAnswers } = JSON.parse(body || "{}");
       if (!quizId || !userAnswers || !Array.isArray(userAnswers)) {
          return generateResponse(400, { message: "quizId and userAnswers array are required." });
       }

       // Fetch the quiz to determine correct answers
       const getRes = await dynamo.send(new GetCommand({
         TableName: QUIZZES_TABLE,
         Key: { quizId }
       }));

       if (!getRes.Item) return generateResponse(404, { message: "Quiz not found" });
       
       const quiz = getRes.Item;
       let score = 0;
       const total = quiz.questions.length;

       // Calculate score
       quiz.questions.forEach((q, index) => {
          if (userAnswers[index] === q.correctOptionIndex) {
              score++;
          }
       });

       const newAttempt = {
          attemptId: uuidv4(),
          userId: user.userId,
          quizId: quizId,
          quizTitle: quiz.title,
          score,
          total,
          timestamp: new Date().toISOString()
       };

       await dynamo.send(new PutCommand({
          TableName: ATTEMPTS_TABLE,
          Item: newAttempt
       }));

       return generateResponse(201, { 
           message: "Attempt submitted successfully", 
           result: { score, total, percentage: (score/total)*100 } 
       });
    }

    // GET /attempts (Fetch history)
    if (httpMethod === "GET") {
        // Since we don't have a complex GSI setup for this simple demo, 
        // we'll scan and filter. Suboptimal for prod, but sufficient for standard DynamoDB generic table use case
        // Without ensuring users ran GSI creation during setup.
        
        const scanRes = await dynamo.send(new ScanCommand({
            TableName: ATTEMPTS_TABLE
        }));

        const items = scanRes.Items || [];
        const userAttempts = items.filter(i => i.userId === user.userId);
        
        // Sort descending
        userAttempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return generateResponse(200, userAttempts);
    }
    
    return generateResponse(404, { message: "Not found" });
  } catch (error) {
    console.error("Attempt Handler Error:", error);
    return generateResponse(500, { message: "Internal server error" });
  }
};
