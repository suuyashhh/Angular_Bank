export const environment = {
  production: false,
  ENCRYPT_KEY: 'dev_secure_encryption_key_32_chars_long_2025!', // 32 characters for AES
  PERSIST_SESSION: true,
  BASE_URL: 'https://localhost:7265/api/', // Local API for development
  APP_VERSION: '1.0.0-dev',
  DEBUG: true,
  LOG_LEVEL: 'debug'
};
