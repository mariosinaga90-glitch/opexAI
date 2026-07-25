import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function migratePasswords() {
  console.log('Starting password migration...');
  try {
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to migrate.`);
    let migratedCount = 0;

    for (const user of allUsers) {
      if (user.password && !user.password.startsWith('$2b$')) {
        // Not a bcrypt hash yet
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, user.id));
        console.log(`Migrated password for user: ${user.email || user.name}`);
        migratedCount++;
      } else {
        console.log(`Skipped user (already hashed or no password): ${user.email || user.name}`);
      }
    }
    console.log(`Migration complete! Successfully hashed ${migratedCount} passwords.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migratePasswords().then(() => process.exit(0));
