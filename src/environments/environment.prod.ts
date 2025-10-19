// src/environments/environment.prod.ts
export const environment = {
  production: true,
  ENCRYPT_KEY: 'prod_bank_key_replace_via_ci', // secure CI/CD only
  PERSIST_SESSION: true,
  BASE_URL: 'https://membersap.bsite.net/api/'
};
