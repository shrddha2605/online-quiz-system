# AWS Deployment Guide

This guide will walk you through manually deploying the Serverless backend and hosting the frontend.

## Prerequisites
1. AWS Account configured via `aws configure` locally.
2. Node.js v18+ installed.

## 1. Create DynamoDB Tables
Open the AWS Console, naviagte to **DynamoDB** -> **Tables** -> **Create table**.
1. **Users Table**: Name `QuizUsers`, Partition key `userId` (String).
2. **Quizzes Table**: Name `Quizzes`, Partition key `quizId` (String).
3. **Attempts Table**: Name `QuizAttempts`, Partition key `attemptId` (String).

## 2. Deploy Backend Lambda Functions
1. In your terminal, navigate to `/backend` folder.
2. Run `npm install` to download dependencies.
3. Zip the contents of the `/backend` folder. **Zip the contents, not the folder itself**.
4. Navigate to AWS **Lambda**, click **Create function**. Node.js 18.x runtime.
5. Create 3 functions: `AuthFunction`, `QuizFunction`, `AttemptFunction`.
6. For each function:
   - Upload the ZIP file.
   - Change the **Handler** mapping under **Runtime settings**:
     - For `AuthFunction`: `auth_handler.handler`
     - For `QuizFunction`: `quiz_handler.handler`
     - For `AttemptFunction`: `attempt_handler.handler`
   - Grant execution roles permission to read/write to your DynamoDB tables (add `AmazonDynamoDBFullAccess` for testing).

## 3. Create API Gateway
1. Navigate to **API Gateway**, create a new **REST API**.
2. Create resources (`/login`, `/register`, `/quizzes`, `/attempts`) and link methods (GET, POST).
3. Select **Lambda Proxy integration** when attaching the respective Lambda functions to the methods.
4. Enable **CORS** for all resources (very important for web apps).
5. Deploy the API to a `prod` stage and copy your Invoke URL.

## 4. Host the Frontend
1. Create an AWS S3 Bucket (e.g., `my-quiz-app-frontend-123`).
2. Uncheck **Block all public access**.
3. Under **Properties**, enable **Static website hosting** (index document: `index.html`).
4. Update Bucket Policy to allow `s3:GetObject` for `*`.
5. Edit `/frontend/app.js` and paste your API Gateway URL into the `API_BASE` variable.
6. Upload all contents of `/frontend` to the S3 bucket.

Your app is now Live!
