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
  streamChannel?: RTMStreamChannel;
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
  streamChannel,
}: Props) {
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [cName, setCName] = useState<string>(Config.channelName);
  const navigation = useNavigation();
  const [param, setParam] = useState<string>('');
  const [token, setToken] = useState<string>(Config.token || '');

  // Update token state when Config.token changes
  useEffect(() => {
    if (Config.token) {
      setToken(Config.token);
    }
  }, [Config.token]);

  useEffect(() => {
    const headerRight = () => <Header />;
    navigation.setOptions({ headerRight });
  }, [navigation]);

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
   * Step 5: renew token
   */
  const renewToken = async () => {
    if (!token) {
      log.error('token is empty');
      return;
    }

    try {
      let result = await client.renewToken(token, {
        channelName: cName,
      });
      log.info('renewToken success', result);
    } catch (status: any) {
      log.error('renewToken error', status);
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
      <AgoraButton
        title={`${loginSuccess ? 'logout' : 'login'}`}
        onPress={() => {
          loginSuccess ? logout() : login();
        }}
      />
      <AgoraTextInput
        onChangeText={(text) => {
          setCName(text);
          onChannelNameChanged?.(text);
        }}
        label="channelName"
        placeholder="please input channelName"
        value={cName}
        disabled={loginSuccess}
      />
      <AgoraTextInput
        onChangeText={(text) => {
          setParam(text);
        }}
        label="param"
        placeholder="please input param"
        value={param}
      />
      <AgoraButton
        title={`setParameters`}
        onPress={() => {
          let result = client.setParameters(param);
          log.info('setParameters', result);
        }}
      />
      <AgoraTextInput
        onChangeText={(text) => {
          setToken(text);
          // Also update Config.token to ensure it's synchronized
          Config.token = text;
        }}
        label="token"
        placeholder="please input token"
        value={token}
      />
      
      <AgoraButton
        title="Renew Token"
        onPress={renewToken}
        disabled={!loginSuccess || !token}
      />
      
      {/* Generate token button that uses the configuration parameters */}
      <AgoraButton 
        title="Generate Token"
        onPress={async () => {
          try {
            // Check if token generation is configured
            if (!Config.tokenGenerationUrl) {
              log.error('Token generation URL is not set');
              return;
            }

            if (!Config.appId || !Config.certificate || !Config.uid) {
              log.error('AppId, certificate or userId is missing');
              return;
            }

            // Parse read/write channels 
            const readChannels = Config.readChannels ? Config.readChannels.split(',').map((c: string) => c.trim()) : [];
            const writeChannels = Config.writeChannels ? Config.writeChannels.split(',').map((c: string) => c.trim()) : [];

            // Prepare request payload
            const payload = {
              appId: Config.appId,
              appCertificate: Config.certificate,
              expireTimestamp: 3600,
              services: [
                {
                  type: "RTM2",
                  userId: Config.uid,
                  privileges: {
                    Login: Config.loginExpireTime
                  },
                  permissions: {
                    "message-channels": {
                      read: readChannels,
                      write: writeChannels
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

            const data = await response.json();
            
            if (data && data.rtmToken) {
              setToken(data.rtmToken);
              Config.token = data.rtmToken;
              log.info('Token generated successfully');
            } else {
              throw new Error('Invalid token response format');
            }
          } catch (error: any) {
            log.error('Failed to generate token', error.message);
          }
        }}
      />
    </AgoraView>
  );
}
