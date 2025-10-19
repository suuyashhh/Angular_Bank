// src/environments/environment.ts
export const environment = {
  production: false,
  ENCRYPT_KEY: 'dev_bank_encryption_key_2025', // replace via CI/CD in prod
  PERSIST_SESSION: true,// default banking: in-memory only
  BASE_URL: 'https://membersap.bsite.net/api/'
  // BASE_URL: 'https://localhost:7265/api/'
};
