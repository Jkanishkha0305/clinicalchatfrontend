# Clinical Trials Search Application - Next.js

This is the separate Next.js frontend for the FastAPI-based `clinicalchatbackend` app. It talks directly to the backend API; there are no Next.js API routes in this repo.

## Features

- ✅ Same product UI carried over into Next.js
- ✅ Responsive design for mobile, tablet, and desktop
- ✅ Clinical trials search with advanced filters
- ✅ AI-powered chat about studies
- ✅ User authentication (login, signup, guest mode)
- ✅ Chat session management
- ✅ Sidebar with chat history
- ✅ Floating chat window
- ✅ Settings modal
- ✅ Search modal
- ✅ Optional agentic analysis panel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Connecting to the Backend

This frontend is intended to run against the FastAPI backend in the sibling `clinicalchatbackend` repo.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_PROJECT_MODE=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_AGENTIC_API_BASE_URL=http://localhost:8081
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL` is the main FastAPI server URL. `NEXT_PUBLIC_AGENTIC_API_BASE_URL` is optional and only needed if agentic endpoints are hosted separately.

### State Management

The application uses **Redux Toolkit** for state management:

- **Auth Slice**: User authentication state
- **Search Slice**: Search filters and results
- **Chat Slice**: Chat messages and current study
- **Sessions Slice**: Chat session management

All API calls are made through Redux async thunks, which handle loading states, errors, and success actions.

## Project Structure

```
clinical/
├── src/
│   ├── app/
│   │   ├── auth/             # Authentication pages (login, signup)
│   │   ├── layout.tsx        # Root layout with Redux Provider
│   │   └── page.tsx          # Main page
│   ├── components/           # React components
│   │   ├── MainApp.tsx       # Main application component
│   │   ├── Sidebar.tsx       # Sidebar with chat history
│   │   ├── SearchForm.tsx    # Search filters form
│   │   ├── Results.tsx       # Search results display
│   │   ├── FloatingChat.tsx  # Floating chat window
│   │   ├── ReduxProvider.tsx # Redux store provider
│   │   └── ...               # Other components
│   ├── store/                # Redux store
│   │   ├── store.ts          # Store configuration
│   │   ├── hooks.ts          # Typed Redux hooks
│   │   └── slices/           # Redux slices
│   │       ├── authSlice.ts      # Authentication state
│   │       ├── searchSlice.ts    # Search state
│   │       ├── chatSlice.ts      # Chat state
│   │       └── sessionsSlice.ts  # Chat sessions state
│   └── lib/                  # Utility functions and API client
│       ├── types.ts          # TypeScript types
│       ├── constants/        # API and model constants
│       ├── utils/            # Helper functions
│       └── api.ts            # API service layer
```

## API Endpoints

The frontend expects these backend routes:

- `POST /api/auth/login` - User login
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/guest` - Guest mode
- `POST /api/search` - Search clinical trials
- `GET /api/study/{nctId}` - Fetch a single study
- `POST /api/statistics` - Search result statistics
- `POST /api/generate-protocol-report` - Protocol report generation
- `POST /api/generate-chat-report` - Session report generation
- `POST /api/generate-study-chat-report` - Study chat report generation
- `POST /api/chat` - Chat about single study
- `POST /api/chat-stream` - Stream chat about a single study
- `POST /api/chat-all` - Chat about all filtered studies
- `POST /api/chat-all-stream` - Stream chat about all filtered studies
- `GET /api/user-preferences` - Read chat preferences
- `PATCH /api/user-preferences` - Update chat preferences
- `GET /api/user-settings` - Read UI settings
- `PATCH /api/user-settings` - Update UI settings
- `GET /api/chat-questions` - Read default/session questions
- `PATCH /api/chat-questions` - Update default/session questions
- `GET /api/chat-sessions` - List chat sessions
- `POST /api/chat-sessions` - Create chat session
- `GET /api/chat-sessions/[id]` - Get chat session
- `PATCH /api/chat-sessions/[id]` - Update chat session
- `DELETE /api/chat-sessions/[id]` - Delete chat session
- `GET /api/study-chat-questions` - Read study chat questions
- `PATCH /api/study-chat-questions` - Update study chat questions
- `GET /api/study-chats` - List study chats
- `GET /api/study-chats/{study_id}` - Fetch a study chat
- `DELETE /api/study-chats/{study_id}/{session_id}` - Delete a study chat

All API calls are made through the API service layer (`src/lib/api.ts`) and are handled by Redux async thunks.

## Responsive Design

The application is fully responsive with breakpoints at:
- Mobile: < 480px
- Tablet: < 768px
- Desktop: > 768px

## Architecture

- **Redux Toolkit**: State management with typed actions and reducers
- **TypeScript**: Full type safety throughout the application
- **React Hooks**: All components use functional components with hooks
- **Direct API Calls**: All requests go directly to FastAPI (no Next.js API routes)
- **SSR/SSG Ready**: Properly configured for server-side rendering and static generation
- **Model Compatibility Layer**: Frontend model choices are mapped to the backend's current provider-level chat API

## Notes

- Local development defaults assume the backend is running on `http://localhost:8081`
- Your checked-in `.env` can still override the local default if you want to point at a deployed backend
- The backend must be running for the application to work
- Authentication is token-based in browser storage; there is no backend logout/status endpoint today
