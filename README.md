# Loop Capstone Product

## Overview
Loop is an immersive social awareness platform built as a capstone project. It uses interactive storytelling and simulations to help users experience the lives and challenges of diverse individuals, fostering empathy and understanding.

## Features
- Interactive 3D globe and scenario selection
- Avatar-based simulations with real-world social issues
- Resource management and decision-making
- UI with Tailwind CSS and styled-components
- Next.js, React, and Three.js integration

## Getting Started
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Run the development server:**
   ```sh
   npm run dev
   ```
3. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

## Database & Prisma
1. **Copy the environment template** and set your PostgreSQL connection string:
   ```sh
   cp .env.example .env
   # DATABASE_URL is currently local and needs to be edited to match your Postgres instance
   ```
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/loop_dev
   ```
2. **Run a local PostgreSQL instance** (example with Docker):
   ```sh
   docker run --name loop-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=capstone -p 5432:5432 -d postgres:16
   ```
3. **Apply the Prisma schema** whenever it changes:
   ```sh
   npx prisma migrate dev
   ```
   This creates the database tables for users, journeys, achievements, Twine stories, and moderation workflows.
4. **Generate the Prisma Client** (included in `migrate dev`, but available standalone for CI):
   ```sh
   npx prisma generate
   ```
5. **Access the data layer** from Next.js server actions/API routes via the generated client at `src/generated/prisma`.

## System Architecture

### 1. High-Level System Architecture

This diagram provides a high-level overview of the mechanism of the app, showing how the user interacts with the frontend, backend, and database.

![alt](app/public/diagram_2.png)

### 2. Data Flow: Story Submission & Review

This sequence diagram illustrates the end-to-end process of a creator submitting a story and an administrator reviewing and approving it. This is a core algorithmic flow of the platform.
![Data Flow for Story Submission & Review](app/public/diagram_1.png)

### Story graph structure
- Stories now live in normalized graph tables: `StoryNode` (passages), `StoryPath` (decisions/edges), and `StoryTransition` (node ↔ path connections). Each path can fan out to multiple nodes, and nodes can reference shared paths, enabling reusable decisions. The schema also tracks media/content metadata for every node.
- Use the dedicated routes (`/api/avatars`, `/api/avatars/[id]`, `/api/stories/[slug]/graph`) to load avatars and their linked story graphs directly from the database.

## Authentication & API backend
- Loop now ships with a Node.js backend implemented through Next.js [route handlers](app/api). Endpoints cover registration/login (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`), user progress (`/api/progress`), and scenario completion (`/api/journeys/complete`).
- Sessions are stored in PostgreSQL (`UserSession` table) and issued as HTTP-only cookies so the frontend can securely fetch data without extra configuration.
- After running `npm run dev`, visit `/register` to create an account or `/login` to sign in. Once authenticated, open `/progress` to load real achievements; use the “Scenario Checklist” buttons to mark scenarios complete and trigger achievement unlock logic backed by Prisma.
- If you seed or add more scenarios/achievements, they’ll automatically flow through the `/api/progress` response and the existing dashboard components without code changes.
- Creators can upgrade accounts at `/creator`, publish stories through `/api/creator/stories`, and view live previews of their graphs. Stories are stored in `TwineStory`, `StoryNode`, `StoryPath`, and `StoryTransition` and linked to the creator via `ownerId`.

### Story approvals & email notifications
Publishing a story now triggers an approval workflow:
- Configure SMTP + admin variables in `.env` so the platform can email reviewers:
  ```env
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=apikey_or_username
  SMTP_PASS=secret
  SMTP_SECURE=false               
  MAIL_FROM_ADDRESS=loop@yourdomain.com
  MAIL_FROM_NAME=Loop Moderation
  ADMIN_APPROVAL_EMAIL=you@yourdomain.com
  APP_BASE_URL=https://loop.yourdomain.com
  ```
- When a creator presses **Publish for Approval**, the backend stores the submission as a `StoryVersion` with status `PENDING`, generates a signed approval token, and emails the admin with *Approve* / *Reject* links.
- The approval endpoint lives at `/api/creator/stories/publish/decision`. It accepts POST requests (for logged-in admins) or GET links (via the emailed token). Approved versions automatically set `TwineStory.latestVersionId` so the platform serves the moderated graph.
- The Creator dashboard surfaces whether the notification email was delivered, so missing SMTP configuration is easy to spot during testing.

### Twine imports & avatar tooling
- The creator dashboard now includes an **Import from Twine** tab. Upload a Twison `.json` export or the `.zip` bundle (via the Twison addon) and Loop will:
  - Convert passages into `StoryNode` records, assign reusable `StoryPath` edges, and populate `StoryTransition` links.
  - Keep imports private until you choose to publish; admins still approve the resulting `StoryVersion`.
  - Auto-suggest a starter avatar when no persona exists so simulations have a playable character.
- Under **Profile & Avatars**, creators can:
  - Update their `UserProfile` (display name, bio, avatar image) so moderation tools show the right identity.
  - Create `AvatarProfile` entries tied to their stories with resource presets (`empathy`, `resilience`, etc.) that the simulation engine will use at runtime.
- Public API routes (`/api/avatars`, `/api/stories/[slug]/graph`) continue to serve only the latest approved content, ensuring imported drafts remain sandboxed until reviewed.

**Starting the app and exercise the flows:**
   ```sh
   npm run dev
   ```
   - Register a new account at `http://localhost:3000/register`.  
   - Log in and visit `/progress` to see your live dashboard.  
   - Use the “Scenario Checklist” buttons to mark completions; watch achievements and metrics update.
   - Inspect stories/avatars via `curl http://localhost:3000/api/avatars` or `curl http://localhost:3000/api/stories/maria-rodriguez/graph`, or query Postgres directly (`docker exec prisma-db psql ...`).
4. **Reset between sessions** by truncating tables or dropping the Docker container when needed.

## Automated tests
- Frontend unit tests live in `tests/frontend` and run with jsdom + Testing Library. Backend/unit helpers live in `tests/backend`.
- Scripts:
  ```sh
  npm run test # run everything
  npm run test:frontend  
  npm run test:backend   
  ```
- Vitest configs (`vitest.config.frontend.ts`, `vitest.config.backend.ts`) keep the two suites isolated while sharing the same codebase via the `@/*` alias.

## Project Structure
- `app/` — Main Next.js app pages and layouts
- `components/` — UI and simulation components
- `hooks/` — Custom React hooks
- `lib/` — Simulation logic and utilities
- `public/` — Static assets (images, icons)
- `styles/` — Global and custom styles
- `types/` — TypeScript types

## Technologies Used
- Next.js
- React
- Three.js
- Tailwind CSS
- styled-components

## Contributing
Pull requests are not currently considered, but suggestions are welcome! Please open an issue for any suggestions.

## License
This project is for educational purposes only.

## Troubleshooting

**Common errors may be related to React and Next.js version mismatches.**
- Make sure your `package.json` uses compatible versions (e.g., React 19 and the latest Next.js for @react-three/fiber@9.x).
- If you see dependency or runtime errors, verify your requirements and update dependencies as needed.
- Run `npm install` after changing versions.

If you encounter issues, check the documentation for each major dependency and ensure your environment matches the required versions.