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
const getEnvValue = (key: string, envKey: string, defaultValue: string = '') => {
  // Try to get from process.env (these should be set at build time in CI/CD)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  
  // Try to get from local env file with the original key name
  if (env && env[envKey] !== undefined) {
    return env[envKey] || '';
  }
  
  // Return default value
  return defaultValue;
};

const config = {
  // Get your own App ID at https://dashboard.agora.io/
  appId: getEnvValue('AGORA_APP_ID', 'appId', ''),
  // Certificate instead of token
  certificate: getEnvValue('AGORA_CERTIFICATE', 'certificate', ''),
  // Token is now generated, not manually entered
  token: getEnvValue('AGORA_TOKEN', 'token', ''),
  channelName: getEnvValue('AGORA_CHANNEL_NAME', 'channelName', 'rtmtestrn'),
  uid: getEnvValue('AGORA_UID', 'uid', ''),
  loginExpireTime: getEnvValue('AGORA_LOGIN_EXPIRE_TIME', 'loginExpireTime', '1800'),
  logFilePath: getEnvValue('AGORA_LOG_FILE_PATH', 'logFilePath', ''),
  server: getEnvValue('AGORA_SERVER', 'server', ''),
  port: parseInt(getEnvValue('AGORA_PORT', 'port', '0'), 10) || 0,
  proxyType: parseInt(getEnvValue('AGORA_PROXY_TYPE', 'proxyType', RtmProxyType.none.toString()), 10) || RtmProxyType.none,
  account: getEnvValue('AGORA_ACCOUNT', 'account', 'ds'),
  password: getEnvValue('AGORA_PASSWORD', 'password', 'ssds'),
  areaCode: parseInt(getEnvValue('AGORA_AREA_CODE', 'areaCode', RtmAreaCode.glob.toString()), 10) || RtmAreaCode.glob,
  encryptionMode: parseInt(getEnvValue('AGORA_ENCRYPTION_MODE', 'encryptionMode', RtmEncryptionMode.none.toString()), 10) || RtmEncryptionMode.none,
  encryptionKey: getEnvValue('AGORA_ENCRYPTION_KEY', 'encryptionKey', ''),
  encryptionSalt: new Array(32).fill(1, 0, 32),
  // Token generation
  tokenGenerationUrl: getEnvValue('AGORA_TOKEN_GEN_URL', 'tokenGenerationUrl', ''),
  tokenGenerationHeaders: getEnvValue('AGORA_TOKEN_GEN_HEADERS', 'tokenGenerationHeaders', '{}'),
  basicAuthValue: getEnvValue('AGORA_BASIC_AUTH', 'basicAuthValue', ''),
  readChannels: getEnvValue('AGORA_READ_CHANNELS', 'readChannels', ''),
  writeChannels: getEnvValue('AGORA_WRITE_CHANNELS', 'writeChannels', ''),
};

export default config;
