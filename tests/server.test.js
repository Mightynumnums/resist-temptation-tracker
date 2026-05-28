import request from 'supertest';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import app from '../server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db.json');

describe('🛡️ Resist API Core Integration Suite', () => {
  let agent;

  beforeEach(async () => {
    // Create an isolated cookie jar agent for every individual test block
    agent = request.agent(app);

    // Clean out db.json back to baseline properties before running each check
    const adapter = new JSONFile(dbPath);
    const db = new Low(adapter, { users: [], items: [] });
    db.data = { users: [], items: [] };
    await db.write();
  });

  it('✅ should register a fresh user account and sign them in automatically', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({
        name: 'Test Wizard',
        email: 'wizard@test.com',
        password: 'securepassword123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('wizard@test.com');
    expect(res.body.user.name).toBe('Test Wizard');
  });

  it('❌ should block duplicate account registrations', async () => {
    // Register account #1
    await agent.post('/api/auth/register').send({
      name: 'User One',
      email: 'duplicate@test.com',
      password: 'password123'
    });

    // Try registering account #2 with identical email constraints
    const res = await agent.post('/api/auth/register').send({
      name: 'User Two',
      email: 'duplicate@test.com',
      password: 'differentpassword123'
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('already exists');
  });

  it('❌ should reject incoming data metrics tracking requests if unauthenticated', async () => {
    // Making an unauthenticated request to prove standard route middleware blocks leaks
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(401);
  });
});