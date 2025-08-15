import { useNavigation } from '@react-navigation/native';
import { useRtm } from 'agora-react-native-rtm';
import React, { useEffect, useState } from 'react';

import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Header } from '../../components/BaseComponent';
import { AgoraButton, AgoraStyle } from '../../components/ui';
import Config from '../../config/agora.config';
import * as log from '../../utils/log';

export default function Login() {
  const [loginSuccess, setLoginSuccess] = useState(false);

  /**
   * Step 1: getRtmClient
   */
  const client = useRtm();

  /**
   * Step 2: initialize rtm client
   */
  useEffect(() => {
    return () => {
      setLoginSuccess(false);
    };
  }, [client]);

  /**
   * Step 3: login to rtm
   */
  const login = async () => {
    try {
      // If token generation URL is set and we have a certificate but no token, try to generate one
      if (Config.tokenGenerationUrl && Config.certificate && !Config.token) {
        try {
          await generateToken();
        } catch (error) {
          // Error already logged in the function
          return;
        }
      }
      
      // Proceed with login
      let result = await client.login({ token: Config.token });
      setLoginSuccess(true);
      log.info('login success', result);
    } catch (status: any) {
      log.error('login error', status);
    }
  };

  /**
   * Step 4 (Optional): logout
   */
  const logout = async () => {
    try {
      let result = await client.logout();
      setLoginSuccess(false);
      log.info('logout success', result);
    } catch (status: any) {
      log.error('logout error', status);
    }
  };

  /**
   * Generate a token using HTTP request
   */
  const generateToken = async () => {
    try {
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
              Login: 3600
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

      // 创建HTTP请求的headers，只使用Basic Auth
      let headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // 如果设置了Basic Auth值，则添加Authorization header
      if (Config.basicAuthValue) {
        headers['Authorization'] = `Basic ${Config.basicAuthValue}`;
        log.info('Using Basic Auth with provided value');
      } else {
        log.info('No Basic Auth value provided');
      }

      // 记录请求信息以便调试
      log.info('Token generation request:', {
        url: Config.tokenGenerationUrl,
        headers: headers,
        payload: payload
      });

      // Make HTTP request
      const response = await fetch(Config.tokenGenerationUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let data;
      
      try {
        // 尝试将响应解析为JSON
        data = JSON.parse(responseText);
      } catch (error) {
        // 如果无法解析为JSON，抛出错误并包含原始响应
        throw new Error(`Failed to parse response as JSON. Status: ${response.status}, Response: ${responseText}`);
      }

      if (!response.ok) {
        // 记录完整响应以便调试
        log.error('HTTP error response:', data);
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(data)}`);
      }

      if (data.token) {
        Config.token = data.token;
        log.info('Token generated successfully');
        return data.token;
      } else {
        log.error('Response has no token field:', data);
        throw new Error(`Token not found in response. Response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      log.error('Token generation failed', error);
      throw error;
    }
  };

  /**
   * Step 5: renew token
   */
  const renewToken = async () => {
    try {
      let result = await client.renewToken(Config.token);
      log.info('renewToken success', result);
    } catch (status: any) {
      log.error('renewToken error', status);
    }
  };

  const navigation = useNavigation();

  useEffect(() => {
    const headerRight = () => <Header />;
    navigation.setOptions({ headerRight });
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={AgoraStyle.fullSize}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={AgoraStyle.fullSize}>
        <AgoraButton
          disabled={!Config.uid}
          title={`${loginSuccess ? 'logout' : 'login'}`}
          onPress={async () => {
            loginSuccess ? await logout() : await login();
          }}
        />
        <AgoraButton 
          title="Generate Token" 
          disabled={!Config.tokenGenerationUrl || !Config.certificate || !Config.uid || !Config.appId}
          onPress={async () => {
            try {
              await generateToken();
            } catch (error) {
              // Error already logged in the function
            }
          }} 
        />
        <AgoraButton title="renewToken" onPress={renewToken} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
