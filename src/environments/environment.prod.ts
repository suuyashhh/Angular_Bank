// export const environment = {
//   production: true,
//   ENCRYPT_KEY: 'prod_bank_key_replace_via_ci',
//   PERSIST_SESSION: true,
//   // BASE_URL: 'https://membersap.bsite.net/api/'
//   BASE_URL: 'http://103.93.97.222:2711/api/'
// };

export const environment = {
  production: true,
  BASE_URL: 'https://probank.local/api/', // if Angular & API on same domain
  ENCRYPT_KEY: 'YOUR_PROD_AES_KEY',
  PERSIST_SESSION: true,
  APP_KEY: 'SMARTBANK-UI-ONLY'
};
