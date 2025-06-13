RiskNinja - Project Scaffold & Workflow Documentation
This document outlines the architecture, workflow, and construction of the RiskNinja platform, an AI-powered commercial insurance analysis tool.

1. High-Level Architecture
The project is a full-stack web application composed of three main services orchestrated with Docker:

securechoice-frontend: A React-based single-page application that serves as the user interface.

riskninja-backend: A Node.js/Express backend API that handles business logic, user authentication, data persistence, and communication with the AI service.

postgres: A PostgreSQL database for persistent storage of user data, documents, and other application information.

minio: An S3-compatible object storage service for storing uploaded documents.

nginx: A reverse proxy that routes requests to the appropriate frontend or backend service.

2. Data Models & Database Schema
The backend utilizes Sequelize as an ORM to interact with the PostgreSQL database. The core models are:

Company: Represents a client company.

id (UUID, PK)

name (String)

domain (String, Unique) - Used for associating users with a company based on their email.

licenseCount (Integer) - The number of licenses purchased by the company.

User: Represents an individual user.

id (UUID, PK)

email (String, Unique)

firstName (String)

lastName (String)

password (String, Hashed)

status (Enum: 'pending', 'active', 'disabled')

role (Enum: 'user', 'admin', 'system_admin')

companyId (UUID, FK to Company)

PolicyDocument: Represents an uploaded insurance policy.

id (UUID, PK)

userId (UUID, FK to User)

customerId (UUID, FK to Customer)

name (String)

originalName (String)

size (Integer)

type (String)

uploadedAt (Date)

status (Enum: 'uploaded', 'processing', 'completed', 'error')

extractedText (Text)

summary (Text)

policyType (String)

fileKey (String) - Key for the file in MinIO/S3.

fileUrl (String) - Pre-signed URL for accessing the file.

ChatMessage: Represents a single message in a chat session.

id (UUID, PK)

userId (UUID, FK to User)

sessionId (UUID, FK to ChatSession)

content (Text)

sender (Enum: 'user', 'ai')

context (JSON)

ChatSession: Groups related chat messages.

id (UUID, PK)

userId (UUID, FK to User)

customerId (UUID, FK to Customer)

title (String)

Customer: Represents a customer or prospect of a user.

id (UUID, PK)

userId (UUID, FK to User)

name (String)

type (Enum: 'customer', 'prospect')

ComparisonReport: Stores the results of a policy comparison.

id (UUID, PK)

userId (UUID, FK to User)

title (String)

content (Text)

documentIds (Array of UUIDs)

3. Core Workflows
3.1. User Onboarding & Authentication

Admin Registration: A new company is created by registering an admin user. The POST /auth/register-admin endpoint is used for this, which creates a Company and an User with the 'admin' role.

User Registration: Regular users can register via POST /auth/register. Their email domain must match an existing company's domain. New users have a 'pending' status.

Login: Users log in via POST /auth/login. Upon successful authentication, a JWT is issued.

License Activation: An admin must activate a 'pending' user via PATCH /admin/users/:userId/activate, changing their status to 'active'. This consumes a license.

3.2. Document Upload and Analysis

File Upload: An authenticated user uploads a document through the frontend's FileUploader component.

Backend Processing: The POST /documents endpoint receives the file.

The file is uploaded to MinIO via FileStorageService.

A PolicyDocument record is created in the database.

The PDF is parsed using pdf-parse to extract text and word spans (pdfUtils.ts).

AI Analysis: The extracted text is sent to the Gemini AI via the aiService for analysis, summarization, and risk scoring.

Database Update: The PolicyDocument record is updated with the analysis results.

3.3. Chat Interaction

Context Building: The ChatContextService on the frontend gathers the current context, including chat history, selected documents, and policy type.

Sending a Message: When a user sends a message:

A chat session is created or reused via the /chat-sessions endpoints.

A comprehensive prompt is built by the aiService, which now includes the full conversation history and text from all selected documents.

The aiService sends the prompt to the Gemini API.

Response Handling: The AI's response is streamed back to the frontend and displayed in the ChatInterface.

Persistence: The conversation is saved to the ChatMessage and ChatSession tables.

3.4. Policy Comparison

Document Selection: The user selects two or more documents for comparison in the frontend.

Report Generation: A request is sent to POST /comparison/generate.

The backend builds a detailed prompt for the AI, including the full text of the selected documents and any additional user-provided context.

The aiService generates the comparison report.

Report Saving & Viewing: The generated report is saved to the ComparisonReport table and can be viewed via the /comparison page by its ID.

4. API Endpoints
The backend exposes a RESTful API with the following main routes:

Route

Method

Description

Authentication

Admin

/auth/register

POST

Register a new user.

Public

No

/auth/login

POST

Log in a user.

Public

No

/auth/profile

GET

Get the current user's profile.

User

No

/documents

POST

Upload a new document.

User

No

/documents

GET

Get all of the user's documents.

User

No

/documents/:id

DELETE

Delete a document.

User

No

/chat/message

POST

Send a message to the chat.

User

No

/chat/history

GET

Get the user's chat history.

User

No

/admin/users

GET

Get all users in the admin's company.

Admin

Yes

/admin/users/:id/activate

PATCH

Activate a user's license.

Admin

Yes

/sysadmin/companies

GET

Get all companies (system admin only).

System Admin

Yes

5. Frontend Structure
The securechoice-frontend is a standard Create React App application with a clear component-based architecture:

components/: Contains reusable UI components like ChatInterface, FileUploader, and Dashboard.

pages/: Contains top-level components for each route, such as Home, Policies, and Admin.

contexts/: Manages global state using React's Context API.

AuthContext: Handles user authentication state and JWT token management.

DocumentContext: Manages uploaded documents and chat state.

ThemeContext: Toggles between light and dark modes.

services/: Contains business logic and API communication.

aiService.ts: A key service that interfaces with the Gemini AI, including building prompts and handling streaming responses.

prompts/: A directory dedicated to storing and managing the various prompts sent to the AI, allowing for easy modification and specialization.

This scaffold provides a solid foundation for understanding and extending the RiskNinja platform.