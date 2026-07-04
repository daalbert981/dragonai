import Link from 'next/link'

export const metadata = {
  title: 'Privacy — Dragon AI',
  description: 'How Dragon AI collects, uses, and protects student data',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dragon AI
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Notice</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

        <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account information:</strong> your name/username and university email address.</li>
            <li><strong>Chat content:</strong> the messages you exchange with the AI teaching assistant.</li>
            <li><strong>Uploaded files:</strong> documents you attach to chat messages.</li>
            <li><strong>Usage data:</strong> timestamps of your activity and material downloads.</li>
          </ul>

          <h2>Who can see your data</h2>
          <ul>
            <li>
              <strong>Your instructor</strong> can see the course roster (names and email
              addresses) and usage statistics, including how many messages each student
              has sent. Instructors do <strong>not</strong> have a reading interface for
              your individual chat conversations.
            </li>
            <li><strong>Other students</strong> cannot see any of your data.</li>
            <li>
              <strong>The platform administrator</strong> can access accounts for
              maintenance and support.
            </li>
          </ul>

          <h2>AI processing</h2>
          <p>
            Your chat messages, attached file content, and course materials are sent to
            the OpenAI API to generate responses. Your name and email address are{' '}
            <strong>never</strong> included in these requests. OpenAI does not train its
            models on API data.
          </p>

          <h2>Data retention</h2>
          <p>
            Chat history is retained according to your course&apos;s retention policy, set
            by your instructor (kept indefinitely, deleted immediately, or deleted after a
            fixed period). When chat data is deleted, your uploaded files are deleted from
            file storage as well. When an account is deleted, all of its chat data and
            files are deleted.
          </p>

          <h2>Where data lives</h2>
          <p>
            The application and database are hosted on Heroku (SOC 2 Type II, ISO 27001
            certified); uploaded files are stored in Google Cloud Storage (SOC 2 Type II,
            ISO 27001 certified). Data is encrypted in transit and at rest, and passwords
            are stored only as bcrypt hashes.
          </p>

          <h2>Questions</h2>
          <p>
            Contact your course instructor with any questions about your data, including
            requests to delete your account.
          </p>
        </div>
      </div>
    </div>
  )
}
