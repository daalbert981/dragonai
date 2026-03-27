# /release — Dragon AI Release Procedure

You MUST follow every step below in order before pushing to Heroku. Do not skip steps.

## Step 1: Security Scan

Scan the entire codebase for leaked secrets. Check for ALL of the following:

1. Hardcoded database connection strings (postgres://, postgresql://) with real credentials (not placeholders)
2. Hardcoded API keys that look real (not placeholders like "sk-your-key-here")
3. Email + plaintext password pairs that could be production credentials
4. AWS credentials, JWT secrets, tokens with real values
5. Any `.env`, `.env.local`, `.env.production` files tracked by git (`git ls-files '*.env*'`)
6. Insecure fallback values for auth tokens (e.g., `|| 'default-token'`)

If ANY real secrets are found, **stop and fix them before proceeding**. Report each finding.

## Step 2: Determine Version Bump

Review all changes since the last version bump by examining `git log` and `git diff` against the last tagged/released version.

Apply the versioning rules from `lib/version.ts`:
- **MAJOR** (x.0.0) — Breaking changes, major redesigns, database migrations requiring manual intervention, new deployment targets
- **MINOR** (x.y.0) — New features, new pages, new API endpoints, significant UI changes, dependency upgrades (e.g. Next.js 14 to 15)
- **PATCH** (x.y.z) — Bug fixes, security patches, copy changes, style tweaks, dependency patches

Ask the user to confirm the version bump type and the new version number before proceeding. Show them what changed and your recommendation.

## Step 3: Update Version

Update the version in BOTH files (they must always match):
1. `lib/version.ts` — update the `APP_VERSION` constant
2. `package.json` — update the `"version"` field

Run `npm install --package-lock-only` to sync `package-lock.json`.

## Step 4: Write Private Release Notes

Create a release notes file at `releases/v{VERSION}.md` (this directory is gitignored — notes stay local).

Format:
```markdown
# v{VERSION} — {Date}

## What Changed
- {Bullet list of every meaningful change since last release}

## Security
- {Any security fixes or concerns addressed}
- {Result of the security scan from Step 1}

## Database
- {Any schema changes, migrations needed, or "No changes"}

## Notes for Developers
- {Any context, gotchas, or follow-up items}

## Deployment
- Deployed to Heroku: {timestamp}
- Deployed by: {user}
```

Show the user the release notes for review before saving.

## Step 5: Commit and Push

1. Stage the version file changes (`lib/version.ts`, `package.json`, `package-lock.json`)
2. Commit with message: `Release v{VERSION} — {one-line summary}`
3. Create a git tag: `git tag v{VERSION}`
4. Push to GitHub: `git push origin main --tags`
5. Push to Heroku: `git push heroku main`
6. Confirm the Heroku build succeeds

## Step 6: Post-Deploy Verification

After Heroku deploy completes:
1. Confirm the build succeeded (check the push output)
2. Remind the user to verify the app is running and the version number shows correctly in the UI header
