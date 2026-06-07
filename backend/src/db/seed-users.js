import { db } from './index.js';
import { users } from './schema.js';

async function seedUsers() {
  console.log('🌱 Seeding users...');

  try {
    const newUsers = [
      {
        id: 'admin01',
        name: 'Admin Utama',
        email: 'admin@opexai.local',
        password: 'admin',
        role: 'admin',
        cluster: 'HO',
        team: 'Management'
      },
      {
        id: 'emp01',
        name: 'Budi Santoso',
        email: 'budi@opexai.local',
        password: 'emp',
        role: 'employee',
        cluster: 'TO Kab. Bekasi',
        team: 'Marketing'
      },
      {
        id: 'emp02',
        name: 'Rina Marlina',
        email: 'rina@opexai.local',
        password: 'emp',
        role: 'employee',
        cluster: 'TO Karawang',
        team: 'Sales'
      }
    ];

    for (const user of newUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
      console.log(`✅ Seeded user: ${user.id} (${user.role})`);
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
