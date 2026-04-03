# API Gateway Routes

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/prod`

## Auth Routes (Lambda: `auth_handler`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/register` | No | Register a new user |
| POST | `/login` | No | Login and receive mock JWT token |

## Quiz Routes (Lambda: `quiz_handler`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/quizzes` | No | Fetch all quizzes (without answers). Supports `?category=Math` |
| GET | `/quizzes/{id}` | Yes | Fetch a specific quiz. Answers only sent if Admin |
| POST | `/quizzes` | Yes (Admin) | Create a new quiz |

## Attempt Routes (Lambda: `attempt_handler`)
| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/attempts` | Yes | Submit a quiz attempt containing user answers |
| GET | `/attempts` | Yes | Retrieve past attempts for the logged-in user |

*Note: All authorized endpoints require a `Authorization: Bearer <token>` header.*
