/**
 * Script to set admin custom claim on a Firebase Auth user.
 * 
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <user-email>
 * Example:
 *   npx tsx scripts/set-admin-claim.ts vdbbdv1234567889@gmail.com
 *
 * NOTE: Ensure FIREBASE_SERVICE_ACCOUNT_JSON is set or service-account.json exists in project root.
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

function getCredentials(): any {
  const rawSaEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (rawSaEnv) {
    if (rawSaEnv.startsWith('{')) {
      try {
        return JSON.parse(rawSaEnv);
      } catch {
        // Fallback
      }
    } else {
      try {
        const decoded = Buffer.from(rawSaEnv, 'base64').toString('utf8').trim();
        if (decoded.startsWith('{')) {
          return JSON.parse(decoded);
        }
      } catch {
        // Fallback
      }
    }
  }

  const saPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    try {
      return JSON.parse(fs.readFileSync(saPath, 'utf8'));
    } catch {
      // Return null below
    }
  }

  return null;
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Please specify an email address. Example: npx tsx scripts/set-admin-claim.ts user@example.com');
    process.exit(1);
  }

  const creds = getCredentials();
  if (!creds) {
    console.error('No Firebase credentials found. Provide FIREBASE_SERVICE_ACCOUNT_JSON or service-account.json.');
    process.exit(1);
  }

  const app = getApps().length > 0 ? getApps()[0]! : initializeApp({ credential: cert(creds) });
  const adminAuth = getAuth(app);

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully granted admin claim to user ${email} (UID: ${user.uid})`);
  } catch (err: any) {
    console.error(`Failed to set admin claim for ${email}:`, err?.message || err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('set-admin-claim.ts')) {
  main();
}
