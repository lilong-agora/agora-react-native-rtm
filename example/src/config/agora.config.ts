import {
  RtmAreaCode,
  RtmEncryptionMode,
  RtmProxyType,
} from 'agora-react-native-rtm';

// Try to get values from local environment file first
let env: any = {};
try {
  env = require('./env_local').default;
} catch (error) {
  console.warn('env_local not found, using environment variables or defaults');
}

// Helper function to get a value from environment variables or use default
const getEnvValue = (key: string, defaultValue: string = '') => {
  // Try to get from process.env (these should be set at build time in CI/CD)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  
  // Try to get from local env file
  if (env && env[key] !== undefined) {
    return env[key] || '';
  }
  
  // Return default value
  return defaultValue;
};

const config = {
  // Get your own App ID at https://dashboard.agora.io/
  appId: getEnvValue('AGORA_APP_ID', ''),
  // Certificate instead of token
  certificate: getEnvValue('AGORA_CERTIFICATE', ''),
  // Token is now generated, not manually entered
  token: getEnvValue('AGORA_TOKEN', ''),
  channelName: getEnvValue('AGORA_CHANNEL_NAME', 'rtmtestrn'),
  uid: getEnvValue('AGORA_UID', ''),
  logFilePath: getEnvValue('AGORA_LOG_FILE_PATH', ''),
  server: getEnvValue('AGORA_SERVER', ''),
  port: parseInt(getEnvValue('AGORA_PORT', '0'), 10) || 0,
  proxyType: parseInt(getEnvValue('AGORA_PROXY_TYPE', RtmProxyType.none.toString()), 10) || RtmProxyType.none,
  account: getEnvValue('AGORA_ACCOUNT', 'ds'),
  password: getEnvValue('AGORA_PASSWORD', 'ssds'),
  areaCode: parseInt(getEnvValue('AGORA_AREA_CODE', RtmAreaCode.glob.toString()), 10) || RtmAreaCode.glob,
  encryptionMode: parseInt(getEnvValue('AGORA_ENCRYPTION_MODE', RtmEncryptionMode.none.toString()), 10) || RtmEncryptionMode.none,
  encryptionKey: getEnvValue('AGORA_ENCRYPTION_KEY', ''),
  encryptionSalt: new Array(32).fill(1, 0, 32),
  // Token generation
  tokenGenerationUrl: getEnvValue('AGORA_TOKEN_GEN_URL', ''),
  tokenGenerationHeaders: getEnvValue('AGORA_TOKEN_GEN_HEADERS', '{}'),
  readChannels: getEnvValue('AGORA_READ_CHANNELS', ''),
  writeChannels: getEnvValue('AGORA_WRITE_CHANNELS', ''),
};

export default config;
