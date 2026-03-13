import { defineConfig, devices } from '@playwright/test'
import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'

// Force-override shell env vars with project-specific .env.local
// (needed because ~/.claude_credentials exports Supabase vars for a different project)
dotenvConfig({ path: resolve(__dirname, '.env.local'), override: true })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './e2e/auth.setup.ts',
  globalTeardown: './e2e/auth.teardown.ts',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/session.json',
      },
    },
  ],

  // Start dev server automatically when running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60000,
  },
})
