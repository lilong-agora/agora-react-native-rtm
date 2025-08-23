import { useNavigation } from '@react-navigation/native';
import {
  LinkStateEvent,
  LockEvent,
  MessageEvent,
  PresenceEvent,
  RTMStreamChannel,
  StorageEvent,
  TokenEvent,
  TopicEvent,
  useRtm,
  useRtmEvent,
} from 'agora-react-native-rtm';
import React, { useEffect, useState } from 'react';

import Config from '../config/agora.config';
import * as log from '../utils/log';

import { LogSink } from './LogSink';
import {
  AgoraButton,
  AgoraStyle,
  AgoraText,
  AgoraTextInput,
  AgoraView,
} from './ui';

interface Props {
  onChannelNameChanged?: (value: string) => void;
  onLoginStatusChanged?: (isLoggedIn: boolean) => void;
  onLinkState?: (linkState: LinkStateEvent) => void;
  onTokenPrivilegeWillExpire?: () => void;
  onLock?: (lock: LockEvent) => void;
  onMessage?: (message: MessageEvent) => void;
  onPresence?: (presence: PresenceEvent) => void;
  onStorage?: (storage: StorageEvent) => void;
  onTopic?: (topic: TopicEvent) => void;
  onToken?: (e: TokenEvent) => void;
}

export const Header = () => {
  const [visible, setVisible] = useState(false);

  const toggleOverlay = () => {
    setVisible(!visible);
  };

  return (
    <>
      <AgoraText onPress={toggleOverlay}>Logs</AgoraText>
      {visible && <LogSink onBackdropPress={toggleOverlay} />}
    </>
  );
};

export default function BaseComponent({
  onChannelNameChanged,
  onLoginStatusChanged,
  onLinkState,
  onTokenPrivilegeWillExpire,
  onLock,
  onMessage,
  onPresence,
  onStorage,
  onTopic,
  onToken,
}: Props) {
  // 使用可折叠状态来控制设置部分的显示
  const [showConnectionSettings, setShowConnectionSettings] = useState<boolean>(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [cName, setCName] = useState<string>(Config.channelName);
  const [userId, setUserId] = useState<string>(Config.uid);
  const [readChannels, setReadChannels] = useState<string>(Config.readChannels || '');
  const [writeChannels, setWriteChannels] = useState<string>(Config.writeChannels || '');
  const [streamChannel, setStreamChannel] = useState<RTMStreamChannel | undefined>(undefined);
  const navigation = useNavigation();
  const [param, setParam] = useState<string>('');
  const [token, setToken] = useState<string>(Config.token || '');
  const [responseFormat, setResponseFormat] = useState<string>('{\"token\":\"token_value\"}');

  // Update states when Config changes
  useEffect(() => {
    if (Config.token) {
      setToken(Config.token);
    }
    if (Config.channelName) {
      setCName(Config.channelName);
    }
    if (Config.uid) {
      setUserId(Config.uid);
    }
    if (Config.readChannels) {
      setReadChannels(Config.readChannels);
    }
    if (Config.writeChannels) {
      setWriteChannels(Config.writeChannels);
    }
  }, [Config.token, Config.channelName, Config.uid, Config.readChannels, Config.writeChannels]);

  useEffect(() => {
    const headerRight = () => <Header />;
    navigation.setOptions({ headerRight });
  }, [navigation]);
  
  // Handle streamChannel when needed
  const createStreamChannel = async () => {
    try {
      let result = await client.createStreamChannel(cName);
      setStreamChannel(result);
      log.info('createStreamChannel success', result);
    } catch (status: any) {
      log.error('createStreamChannel error', status);
    }
  };

  useEffect(() => {
    return () => {
      log.logSink.clearData();
    };
  }, []);

  /**
   * Step 1: getRtmClient
   */
  const client = useRtm();

  /**
   * Step 3: login to rtm
   */
  const login = async () => {
    try {
      await client.login({ token: Config.token });
      setLoginSuccess(true);
      onLoginStatusChanged?.(true);
    } catch (status: any) {
      log.error('login error', status);
    }
  };

  /**
   * Step 4 (Optional): logout
   */
  const logout = async () => {
    try {
      await client.logout();
      setLoginSuccess(false);
      onLoginStatusChanged?.(false);
    } catch (status: any) {
      log.error('logout error', status);
    }
  };

  /**
   * 一键生成并更新Token (废弃) - 已拆分为两个单独的功能
   * @deprecated 使用独立的生成和更新功能代替
   */
  const _generateAndRenewToken = async () => {
    // 此函数已废弃，不再使用
    log.error('此函数已废弃，请使用独立的生成和更新功能');
  };

  /**
   * 生成Token
   */
  const generateToken = async (): Promise<string | null> => {
    try {
      // Check if token generation is configured
      if (!Config.tokenGenerationUrl) {
        log.error('Token generation URL is not set');
        return null;
      }

      if (!Config.appId || !Config.certificate) {
        log.error('AppId or certificate is missing');
        return null;
      }
      
      // 使用当前UI上的userId而不是Config里的，确保使用最新值
      if (!userId) {
        log.error('UserId is missing');
        return null;
      }

      // Parse read/write channels from local state instead of Config
      // This ensures we use the most up-to-date values from the UI
      const readChannelsList = readChannels ? readChannels.split(',').map((c: string) => c.trim()) : [];
      const writeChannelsList = writeChannels ? writeChannels.split(',').map((c: string) => c.trim()) : [];

      // Prepare request payload
      const payload = {
        appId: Config.appId,
        appCertificate: Config.certificate,
        expireTimestamp: 3600,
        services: [
          {
            type: "RTM2",
            userId: userId, // 使用组件内的userId
            privileges: {
              Login: Config.loginExpireTime
            },
            permissions: {
              "message-channels": {
                read: readChannelsList,
                write: writeChannelsList
              }
            }
          }
        ]
      };

      // Create HTTP request headers
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (Config.basicAuthValue) {
        headers['Authorization'] = `Basic ${Config.basicAuthValue}`;
      }

      log.info('Generating token with payload', payload);
      
      // Make HTTP request
      const response = await fetch(Config.tokenGenerationUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      log.info('Raw response:', responseText);
      
      try {
        // 尝试解析JSON
        const data = JSON.parse(responseText);
        
        // 尝试应用自定义的响应格式解析
        const expectedFormat = JSON.parse(responseFormat);
        const tokenKey = Object.keys(expectedFormat)[0]; // 获取第一个键作为token的键名
        
        if (data && tokenKey && data[tokenKey]) {
          const tokenValue = data[tokenKey];
          setToken(tokenValue);
          Config.token = tokenValue;
          // 同时更新Config中的所有相关参数
          Config.uid = userId;
          Config.channelName = cName;
          Config.readChannels = readChannels;
          Config.writeChannels = writeChannels;
          log.info('Token generated successfully');
          return tokenValue;
        } else {
          throw new Error('Token field not found in response');
        }
      } catch (parseError) {
        log.error('Failed to parse response:', parseError);
        throw new Error('Invalid JSON response format');
      }
    } catch (error: any) {
      log.error('Failed to generate token', error.message);
      return null;
    }
  };

  useRtmEvent(client, 'linkState', (linkState: LinkStateEvent) => {
    if (onLinkState) {
      onLinkState(linkState);
    } else {
      log.info('linkState', linkState);
    }
  });

  useRtmEvent(client, 'tokenPrivilegeWillExpire', () => {
    if (onTokenPrivilegeWillExpire) {
      onTokenPrivilegeWillExpire();
    } else {
      log.info('tokenPrivilegeWillExpire');
    }
  });

  useRtmEvent(client, 'lock', (lock: LockEvent) => {
    if (onLock) {
      onLock(lock);
    } else {
      log.info('lock', lock);
    }
  });

  useRtmEvent(client, 'message', (message: MessageEvent) => {
    if (onMessage) {
      onMessage(message);
    } else {
      log.info('message', message);
    }
  });

  useRtmEvent(client, 'topic', (topic: TopicEvent) => {
    if (onTopic) {
      onTopic(topic);
    } else {
      log.info('topic', topic);
    }
  });

  useRtmEvent(client, 'presence', (presence: PresenceEvent) => {
    if (onPresence) {
      onPresence(presence);
    } else {
      log.info('presence', presence);
    }
  });

  useRtmEvent(client, 'storage', (storage: StorageEvent) => {
    if (onStorage) {
      onStorage(storage);
    } else {
      log.info('storage', storage);
    }
  });

  useRtmEvent(client, 'token', (e: TokenEvent) => {
    if (onToken) {
      onToken(e);
    } else {
      log.info('token', e);
    }
  });

  return (
    <AgoraView style={AgoraStyle.fullWidth}>
      {/* 基本控制按钮 */}
      <AgoraView style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <AgoraButton
          title={`${loginSuccess ? 'Logout' : 'Login'}`}
          onPress={() => {
            loginSuccess ? logout() : login();
          }}
        />
        
        <AgoraButton
          title={`${showConnectionSettings ? 'Hide' : 'Show'} Token Settings`}
          onPress={() => setShowConnectionSettings(!showConnectionSettings)}
        />
      </AgoraView>
      
      {/* 基本信息显示 - 简洁模式 */}
      {!showConnectionSettings && (
        <AgoraView style={{ padding: 5, marginBottom: 5, borderWidth: 1, borderColor: '#ddd', borderRadius: 5 }}>
          <AgoraText>Channel: {cName} | User: {userId}</AgoraText>
          {streamChannel && <AgoraText style={{ color: 'blue' }}>Stream Channel Mode</AgoraText>}
        </AgoraView>
      )}
      
      {/* 身份验证和连接部分 - 可折叠 */}
      {showConnectionSettings && (
      <AgoraView style={{ marginTop: 10, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 }}>
        <AgoraText style={{ fontWeight: 'bold', marginBottom: 5 }}>Connection Settings:</AgoraText>
        
        <AgoraTextInput
          onChangeText={(text) => {
            setCName(text);
            onChannelNameChanged?.(text);
            // 实时更新Config
            Config.channelName = text;
          }}
          label="Channel Name"
          placeholder="Please input channel name"
          value={cName}
          disabled={loginSuccess}
        />
        
        <AgoraTextInput
          onChangeText={(text) => {
            setUserId(text);
            // 实时更新Config
            Config.uid = text;
          }}
          label="User ID"
          placeholder="Please input user ID"
          value={userId}
          disabled={loginSuccess}
        />
        
        <AgoraTextInput
          onChangeText={(text) => {
            setToken(text);
            // Also update Config.token to ensure it's synchronized
            Config.token = text;
          }}
          label="Token"
          placeholder="Please input token"
          value={token}
        />

        {/* 响应格式设置 */}
        <AgoraTextInput
          onChangeText={(text) => {
            setReadChannels(text);
            // 实时更新Config
            Config.readChannels = text;
          }}
          label="Read Channels (comma-separated)"
          placeholder="channel1,channel2,channel3"
          value={readChannels}
        />
        
        <AgoraTextInput
          onChangeText={(text) => {
            setWriteChannels(text);
            // 实时更新Config
            Config.writeChannels = text;
          }}
          label="Write Channels (comma-separated)"
          placeholder="channel1,channel2,channel3"
          value={writeChannels}
        />
        
        <AgoraTextInput
          onChangeText={(text) => {
            setResponseFormat(text);
          }}
          label="Response Format (JSON)"
          placeholder='e.g. {"rtmToken":"token_value"}'
          value={responseFormat}
        />
        
        {/* Token操作按钮 */}
        <AgoraView style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <AgoraButton
            title="Generate Token"
            onPress={async () => {
              try {
                // 生成新token
                const newToken = await generateToken();
                if (newToken) {
                  log.info('Token generated successfully');
                }
              } catch (error) {
                // 错误已在函数中记录
              }
            }}
            disabled={!Config.tokenGenerationUrl || !Config.appId || !Config.certificate || !userId}
          />
          <AgoraButton
            title="Renew Token"
            onPress={async () => {
              try {
                if (!Config.token) {
                  log.error('No token to renew');
                  return;
                }
                let result = await client.renewToken(Config.token, 
                  streamChannel ? { channelName: cName } : undefined
                );
                log.info('Token renewed successfully', result);
              } catch (error: any) {
                log.error('Token renewal failed', error);
              }
            }}
            disabled={!Config.token || !loginSuccess}
          />
        </AgoraView>

        {/* 状态显示 */}
        {streamChannel && (
          <AgoraText style={{ marginTop: 10, color: 'blue' }}>
            Stream Channel Mode: {cName}
          </AgoraText>
        )}
      </AgoraView>
      )}
      
      {/* 高级设置部分 - 可折叠 */}
      {showConnectionSettings && (
        <AgoraView style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5 }}>
          <AgoraText style={{ fontWeight: 'bold', marginBottom: 5 }}>Advanced Settings:</AgoraText>
          
          <AgoraTextInput
            onChangeText={(text) => {
              setParam(text);
            }}
            label="Parameters"
            placeholder="Please input JSON parameters"
            value={param}
          />
          
          <AgoraButton
            title="Set Parameters"
            onPress={() => {
              try {
                let result = client.setParameters(param);
                log.info('setParameters success', result);
              } catch (error: any) {
                log.error('setParameters error', error);
              }
            }}
          />
        </AgoraView>
      )}
    </AgoraView>
  );
}
