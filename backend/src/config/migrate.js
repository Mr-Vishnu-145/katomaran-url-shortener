const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { DATABASE_URL } = require('./env');

async function runMigration() {
  console.log("Starting Database Migration...");

  // Extract database name and base URL
  // e.g. postgresql://postgres:root@localhost:5432/linksphere_ai
  const matches = DATABASE_URL.match(/\/([^\/\?]+)(\?.*)?$/);
  if (!matches) {
    console.error("Invalid DATABASE_URL format.");
    process.exit(1);
  }
  const dbName = matches[1];
  const baseUrl = DATABASE_URL.substring(0, DATABASE_URL.length - dbName.length - (matches[2] ? matches[2].length : 0));

  // Connect to default 'postgres' database to create database if not exists
  try {
    const defaultDbUrl = baseUrl + 'postgres' + (matches[2] || '');
    const client = new Client({ connectionString: defaultDbUrl });
    await client.connect();
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (dbCheck.rows.length === 0) {
      console.log(`Database ${dbName} does not exist. Creating it...`);
      // CREATE DATABASE cannot run inside transaction block, so we execute it directly
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database ${dbName} created successfully.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
    await client.end();
  } catch (err) {
    console.warn("Notice: Could not automatically verify or create database (normal on managed hosts like Neon or Supabase):", err.message);
    console.log(`Proceeding to connect directly to target database "${dbName}" and run migrations...`);
  }

  // Connect to linksphere_ai database to create tables
  const dbClient = new Client({ connectionString: DATABASE_URL });
  try {
    await dbClient.connect();

    // Begin Transaction
    await dbClient.query('BEGIN');

    // Create Tables
    await dbClient.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_suspended BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS urls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        original_url TEXT NOT NULL,
        short_code VARCHAR(50) UNIQUE NOT NULL,
        click_count INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS url_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url_id UUID REFERENCES urls(id) ON DELETE CASCADE NOT NULL,
        visited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referer TEXT,
        country VARCHAR(100),
        device_type VARCHAR(100),
        browser VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        token TEXT UNIQUE NOT NULL,
        device_name VARCHAR(255),
        ip_address VARCHAR(45),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Alter users table to support Google login, and create reset tokens table
    await dbClient.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_profile_image TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      ALTER TABLE url_visits ADD COLUMN IF NOT EXISTS visitor_id VARCHAR(100);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active' NOT NULL;

      CREATE TABLE IF NOT EXISTS deleted_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        deleted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Sync status with is_suspended
    await dbClient.query(`
      UPDATE users SET status = 'suspended' WHERE is_suspended = true AND status = 'active';
      UPDATE users SET is_suspended = true WHERE status = 'suspended' OR status = 'deleted';
    `);

    // Create Indexes
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
      CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
      CREATE INDEX IF NOT EXISTS idx_url_visits_visited_at_desc ON url_visits(visited_at DESC);
      CREATE INDEX IF NOT EXISTS idx_url_visits_url_id ON url_visits(url_id);
      CREATE INDEX IF NOT EXISTS idx_url_visits_visitor_id ON url_visits(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_urls_active ON urls(short_code) WHERE is_active = true;
    `);

    // Update existing admin email from admin@katomaran.com to admin@gmail.com if it exists
    await dbClient.query("UPDATE users SET email = 'admin@gmail.com' WHERE email = 'admin@katomaran.com'");

    // Seed Admin Account if it doesn't exist
    const adminEmail = 'admin@gmail.com';
    const adminCheck = await dbClient.query("SELECT 1 FROM users WHERE email = $1", [adminEmail]);
    if (adminCheck.rows.length === 0) {
      console.log("Seeding admin user...");
      const passwordHash = await bcrypt.hash('AdminPass123!', 12);
      await dbClient.query(
        "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)",
        [adminEmail, passwordHash, 'admin']
      );
      console.log("Admin account created: admin@gmail.com / AdminPass123!");
    } else {
      console.log("Admin account already exists.");
    }

    await dbClient.query('COMMIT');
    console.log("Database Migration and Seeding finished successfully.");
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error("Migration error:", err.stack);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

runMigration();
