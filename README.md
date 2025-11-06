# Dragon AI

An AI-powered teaching assistant platform designed for university instructors to enhance the learning experience.

## Tech Stack

- **Frontend Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + shadcn/ui components
- **File Storage**: Vercel Blob
- **AI Integration**: OpenAI API
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Features (Planned)

- Role-based authentication (Student, Admin, Superadmin)
- AI-powered teaching assistance
- Course and assignment management
- Real-time collaboration
- File upload and management
- Analytics and reporting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- OpenAI API key
- Vercel account (for Blob storage)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd dragonai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Then edit `.env` and fill in your actual values:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dragonai?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token-here"
```

4. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Push the schema to your database
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

### Database
- `DATABASE_URL`: PostgreSQL connection string

### Authentication
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Base URL of your application (http://localhost:3000 for development)

### AI Services
- `OPENAI_API_KEY`: Your OpenAI API key from https://platform.openai.com/api-keys

### File Storage
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

## Project Structure

```
dragonai/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes (grouped)
│   │   ├── login/
│   │   └── register/
│   ├── student/           # Student dashboard
│   ├── admin/             # Admin dashboard
│   ├── superadmin/        # Superadmin dashboard
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── shared/           # Shared components
├── lib/                  # Utility functions
│   ├── utils.ts          # General utilities
│   └── prisma.ts         # Prisma client
├── types/                # TypeScript type definitions
├── prisma/               # Prisma schema and migrations
│   └── schema.prisma
├── public/               # Static assets
└── ...config files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Adding shadcn/ui Components

The project is pre-configured for shadcn/ui. To add new components:

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

The following components are recommended for this project:
- button
- card
- input
- dialog
- dropdown-menu
- table
- textarea
- form
- select
- avatar
- badge

## Database Management

### View Database with Prisma Studio
```bash
npm run db:studio
```

### Update Database Schema
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` for development
3. Run `npm run db:migrate` for production

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

Ensure you set all environment variables and have a PostgreSQL database available.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.
