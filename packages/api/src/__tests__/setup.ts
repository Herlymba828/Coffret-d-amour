/**
 * Les tests ne doivent jamais dépendre du .env de la machine : dotenv
 * n'écrase pas les variables déjà définies, donc celles-ci gagnent.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'secret-de-test-suffisamment-long-pour-passer-le-garde-fou';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.SHARED_CODE = '14-02-2020-Marie';
process.env.SHARED_PASSWORD = 'notre-coffret';
