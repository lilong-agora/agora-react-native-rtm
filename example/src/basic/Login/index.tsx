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
      const readChannels = Config.readChannels ? Config.readChannels.split(',').map(c => c.trim()) : [];
      const writeChannels = Config.writeChannels ? Config.writeChannels.split(',').map(c => c.trim()) : [];

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

      // Parse headers if provided
      let headers = {};
      try {
        if (Config.tokenGenerationHeaders) {
          headers = JSON.parse(Config.tokenGenerationHeaders);
        }
      } catch (error) {
        log.error('Failed to parse token generation headers', error);
      }

      // Add default content-type if not provided
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      // Make HTTP request
      const response = await fetch(Config.tokenGenerationUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.token) {
        Config.token = data.token;
        log.info('Token generated successfully');
        return data.token;
      } else {
        throw new Error('Token not found in response');
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
