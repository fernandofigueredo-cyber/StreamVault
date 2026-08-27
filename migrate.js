const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
  await client.query(`INSERT INTO users (email, password, name) VALUES ('teste@teste.com', '123456', 'Teste') ON CONFLICT DO NOTHING;`);
  console.log('OK');
  await client.end();
}
run();
