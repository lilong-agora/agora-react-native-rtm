import { useNavigation } from '@react-navigation/native';
import { useRtm } from 'agora-react-native-rtm';

import React, { useEffect, useState } from 'react';

import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  ChannelProfileType,
  SDKBuildInfo,
  createAgoraRtcEngine,
} from 'react-native-agora';

import { Header } from '../../components/BaseComponent';

import { AgoraButton, AgoraStyle, AgoraText, AgoraTextInput, AgoraView } from '../../components/ui';
import Config from '../../config/agora.config';
import * as log from '../../utils/log';

export default function UseRTC() {
  const [rtcVersion, setRtcVersion] = useState<SDKBuildInfo>({
    version: '',
    build: 0,
  });
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [token, setToken] = useState<string>(Config.token || '');
  const [loginExpireTime, setLoginExpireTime] = useState<number>(Config.loginExpireTime || 1800);

  /**
   * Step 1: getRtmClient
   */
  const client = useRtm();

  /**
   * Step 3: login to rtm
   */
  const login = async () => {
    try {
      let result = await client.login({ token });
      setLoginSuccess(true);
      log.info('login success', result);
    } catch (status: any) {
      log.error('login error', status);
    }
  };
  
  /**
   * 生成Token
   */
  const generateToken = async () => {
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
              Login: loginExpireTime
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
      
      if (data && data.token) {
        const newToken = data.token;
        setToken(newToken);
        Config.token = newToken;
        log.info('Token generated successfully');
      } else {
        throw new Error('Invalid token response format');
      }
    } catch (error: any) {
      log.error('Failed to generate token', error.message);
    }
  };

  /**
   * 更新Token
   */
  const renewToken = async () => {
    try {
      if (!token) {
        log.error('No token to renew');
        return;
      }
      let result = await client.renewToken(token);
      log.info('Token renewed successfully', result);
    } catch (error: any) {
      log.error('Token renewal failed', error);
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

  useEffect(() => {
    let engine = createAgoraRtcEngine();
    engine.initialize({
      appId: Config.appId,
      channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
    });
    setRtcVersion(engine.getVersion());
    return () => {
      engine.release();
    };
  }, []);

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
        <AgoraText>{`RTC version:${rtcVersion.version},build: ${rtcVersion.build}`}</AgoraText>
        <AgoraTextInput
          onChangeText={(text) => {
            setToken(text);
            Config.token = text;
          }}
          label="Token"
          placeholder="please input token"
          value={token}
        />
        <AgoraTextInput
          onChangeText={(text) => {
            const value = parseInt(text, 10);
            if (!isNaN(value)) {
              setLoginExpireTime(value);
              Config.loginExpireTime = value;
            }
          }}
          label="Login Expire Time (seconds)"
          placeholder="Enter login expire time in seconds"
          value={loginExpireTime.toString()}
        />
        <AgoraView style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AgoraButton
            title="Generate Token"
            onPress={generateToken}
            disabled={!Config.tokenGenerationUrl || !Config.appId || !Config.certificate || !Config.uid}
          />
          <AgoraButton
            title="Renew Token"
            onPress={renewToken}
            disabled={!loginSuccess || !token}
          />
        </AgoraView>
        <AgoraButton
          title={`${loginSuccess ? 'logout' : 'login'}`}
          onPress={() => {
            loginSuccess ? logout() : login();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
