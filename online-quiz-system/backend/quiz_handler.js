const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const QUIZZES_TABLE = process.env.QUIZZES_TABLE || "Quizzes";

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

// Simple middleware to parse mock token (base64 of userId:role)
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
    const { httpMethod, path, pathParameters, queryStringParameters, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // GET /quizzes
    if (httpMethod === "GET" && (!pathParameters || !pathParameters.id)) {
      const category = queryStringParameters?.category || null;
      let params = { TableName: QUIZZES_TABLE };
      
      const scanRes = await dynamo.send(new ScanCommand(params));
      let quizzes = scanRes.Items || [];

      // Manual filtering for category if provided
      if (category && category !== "All") {
        quizzes = quizzes.filter(q => q.category.toLowerCase() === category.toLowerCase());
      }
      
      // Strip out answer keys for public listing
      const publicQuizzes = quizzes.map(q => ({
        quizId: q.quizId,
        title: q.title,
        description: q.description,
        category: q.category,
        createdAt: q.createdAt,
        questionCount: q.questions.length
      }));

      return generateResponse(200, publicQuizzes);
    }

    // GET /quizzes/{id}
    if (httpMethod === "GET" && pathParameters && pathParameters.id) {
       const user = verifyToken(event);
       // Allow fetching specific quiz. In a more secure app, we'd only return questions if authorized.
       const getRes = await dynamo.send(new GetCommand({
          TableName: QUIZZES_TABLE,
          Key: { quizId: pathParameters.id }
       }));
       
       if (!getRes.Item) return generateResponse(404, { message: "Quiz not found" });

       let quiz = getRes.Item;
       // Remove correctOptionIndex unless admin
       if (!user || user.role !== "admin") {
         quiz.questions = quiz.questions.map(q => {
             const { correctOptionIndex, ...publicQ } = q;
             return publicQ;
         });
       }

       return generateResponse(200, quiz);
    }

    // POST /quizzes (Admin Only)
    if (httpMethod === "POST") {
      const user = verifyToken(event);
      if (!user || user.role !== "admin") {
         return generateResponse(403, { message: "Forbidden - Admins only" });
      }

      const { title, description, category, questions } = requestBody;
      if (!title || !questions || !questions.length) {
         return generateResponse(400, { message: "Title and questions are required." });
      }

      const newQuiz = {
        quizId: uuidv4(),
        title,
        description: description || "",
        category: category || "General",
        questions, 
        createdAt: new Date().toISOString()
      };

      await dynamo.send(new PutCommand({
        TableName: QUIZZES_TABLE,
        Item: newQuiz
      }));

      return generateResponse(201, { message: "Quiz created successfully", quizId: newQuiz.quizId });
    }

    return generateResponse(404, { message: "Not found" });
  } catch (error) {
    console.error("Quiz Handler Error:", error);
    return generateResponse(500, { message: "Internal server error" });
  }
};
