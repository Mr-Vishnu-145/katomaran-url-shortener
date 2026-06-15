const { Client } = require('pg');
const { DATABASE_URL } = require('./env');

const client = new Client({ connectionString: DATABASE_URL });

async function check() {
  await client.connect();
  const users = await client.query('SELECT count(*), role FROM users GROUP BY role');
  console.log('USERS COUNT BY ROLE:', users.rows);
  const urls = await client.query('SELECT count(*) FROM urls');
  console.log('TOTAL URLS:', urls.rows);
  const visits = await client.query('SELECT count(*) FROM url_visits');
  console.log('TOTAL VISITS:', visits.rows);
  const urlOwners = await client.query('SELECT u.short_code, usr.email, usr.role FROM urls u JOIN users usr ON u.user_id = usr.id');
  console.log('URLS LIST:', urlOwners.rows);
  await client.end();
}

check().catch(console.error);
