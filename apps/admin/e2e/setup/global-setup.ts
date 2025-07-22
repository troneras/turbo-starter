import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create screenshots directory if it doesn't exist
await mkdir(join(__dirname, '..', 'screenshots'), { recursive: true });

// Set test environment variables
process.env.VITE_TEST_MODE = 'true';

console.log('E2E test environment setup complete');