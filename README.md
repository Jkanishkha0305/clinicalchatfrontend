# Clinical Trials Search Application - Next.js 
 
This is the Next.js version of the Clinical Trials Search Application. It maintains the same UI and functionality as the Flask version.

## Features

- ✅ Same UI design as Flask version
- ✅ Responsive design for mobile, tablet, and desktop
- ✅ Clinical trials search with advanced filters
- ✅ AI-powered chat about studies
- ✅ User authentication (login, signup, guest mode)
- ✅ Chat session management
- ✅ Sidebar with chat history
- ✅ Floating chat window
- ✅ Settings modal
- ✅ Search modal

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

## Connecting to Flask Backend

This Next.js frontend connects directly to the Flask backend. No Next.js API routes are used.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5033
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The `NEXT_PUBLIC_API_BASE_URL` is used by the API service layer to make requests to your Flask backend.

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
│   └── lib/                  # Utility functions
│       ├── types.ts          # TypeScript types
│       ├── utils.ts          # Helper functions
│       ├── config.ts         # Configuration (API URLs)
│       └── api.ts            # API service layer
```

## API Endpoints

The application connects to the Flask backend at these endpoints:

- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/guest` - Guest mode
- `POST /api/search` - Search clinical trials
- `POST /api/chat` - Chat about single study
- `POST /api/chat-all` - Chat about all filtered studies
- `GET /api/chat-sessions` - List chat sessions
- `POST /api/chat-sessions` - Create chat session
- `GET /api/chat-sessions/[id]` - Get chat session
- `PATCH /api/chat-sessions/[id]` - Update chat session
- `DELETE /api/chat-sessions/[id]` - Delete chat session

All API calls are made through the API service layer (`src/lib/api.ts`) and are handled by Redux async thunks.

## Responsive Design

The application is fully responsive with breakpoints at:
- Mobile: < 480px
- Tablet: < 768px
- Desktop: > 768px

All UI components adapt to different screen sizes.

## Architecture

- **Redux Toolkit**: State management with typed actions and reducers
- **TypeScript**: Full type safety throughout the application
- **React Hooks**: All components use functional components with hooks
- **Direct API Calls**: All API calls go directly to Flask backend (no Next.js API routes)
- **SSR/SSG Ready**: Properly configured for server-side rendering and static generation
- **No `any` Types**: All TypeScript types are properly defined

## Notes

- The UI matches the Flask version exactly
- All functionality is preserved
- Components are built with React hooks and Redux
- TypeScript is used for type safety (no `any` types)
- CSS is ported directly from the Flask version
- The Flask backend must be running for the application to work
- All API calls include credentials (cookies) for session management
