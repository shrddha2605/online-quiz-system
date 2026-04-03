# DynamoDB Schema Definitions

## 1. Table: `QuizUsers`
- **Primary Key**: `userId` (String) - Maps to User Email
- **Attributes**:
  - `username` (String)
  - `passwordHash` (String)
  - `role` (String)
  - `createdAt` (String/ISO-Date)

## 2. Table: `Quizzes`
- **Primary Key**: `quizId` (String) - UUID
- **Attributes**:
  - `title` (String)
  - `description` (String)
  - `category` (String)
  - `questions` (List of Objects):
    - `questionText` (String)
    - `options` (List of Strings)
    - `correctOptionIndex` (Number)
  - `createdAt` (String/ISO-Date)

## 3. Table: `QuizAttempts`
- **Primary Key**: `attemptId` (String) - UUID
- **Attributes**:
  - `userId` (String)
  - `quizId` (String)
  - `quizTitle` (String)
  - `score` (Number)
  - `total` (Number)
  - `timestamp` (String/ISO-Date)
