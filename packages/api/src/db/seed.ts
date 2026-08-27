import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { pool, query } from './pool.js';

async function seed() {
  const existing = await query<{ count: number }>('SELECT COUNT(*)::int AS count FROM users');
  if (existing.rows[0].count > 0) {
    console.log('Database already seeded, skipping.');
    await pool.end();
    return;
  }

  console.log('Seeding database…');

  const codeHash = await bcrypt.hash(config.sharedCode, 10);
  const passwordHash = await bcrypt.hash(config.sharedPassword, 10);

  await query(
    `INSERT INTO couple_settings (shared_code_hash, welcome_phrase, relationship_start_date, anniversary_date, midnight_message_template)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      `${codeHash}:${passwordHash}`,
      config.couple.welcomePhrase,
      config.couple.relationshipStart,
      config.couple.anniversaryDate,
      config.couple.midnightMessage,
    ],
  );

  const users = await query<{ id: string; role: string }>(
    `INSERT INTO users (display_name, role) VALUES
      ('Toi', 'owner'),
      ('Marie', 'partner')
     RETURNING id, role`,
  );

  const ownerId = users.rows.find((u) => u.role === 'owner')!.id;
  const partnerId = users.rows.find((u) => u.role === 'partner')!.id;

  await query(
    `INSERT INTO albums (title, year, theme, created_by) VALUES
      ('Nos débuts', 2020, 'rencontre', $1),
      ('Voyages', 2023, 'aventure', $1),
      ('Quotidien', 2024, 'bonheur', $2)`,
    [ownerId, partnerId],
  );

  // Les souvenirs ne sont pas rattachés à un album (memories.media_id seulement) :
  // on les insère une seule fois, pas une fois par album.
  await query(
    `INSERT INTO memories (title, description, event_date, created_by) VALUES
      ('Premier regard', 'Le jour où tout a commencé…', '2020-02-14', $1),
      ('Premier voyage', 'Notre escapade inoubliable', '2022-06-15', $1),
      ('Notre chez-nous', 'Les premières clés, les premiers cartons', '2023-09-01', $2)`,
    [ownerId, partnerId],
  );

  console.log('Seed complete.');
  console.log(`  Owner ID: ${ownerId}`);
  console.log(`  Partner ID: ${partnerId}`);
  console.log(`  Login code: ${config.sharedCode}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
