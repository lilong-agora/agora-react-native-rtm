import type { RTMStreamChannel } from 'agora-react-native-rtm';
import { JoinChannelOptions, useRtm } from 'agora-react-native-rtm';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import BaseComponent from '../../components/BaseComponent';
import { AgoraButton, AgoraStyle, AgoraTextInput } from '../../components/ui';
import Config from '../../config/agora.config';
import * as log from '../../utils/log';

export default function CreateStreamChannel() {
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [streamChannel, setStreamChannel] = useState<RTMStreamChannel>();
  const [cName, setCName] = useState<string>(Config.channelName);
  const [loginExpireTime, setLoginExpireTime] = useState<number>(Config.loginExpireTime || 1800);

  /**
   * Step 1: getRtmClient and initialize rtm client from BaseComponent
   */
  const client = useRtm();

  /**
   * Step 2 : createStreamChannel
   */
  const createStreamChannel = async () => {
    if (joinSuccess) {
      log.error('already joined channel');
      return;
    }
    try {
      let result = await client.createStreamChannel(cName);
      setStreamChannel(result);
      log.info('createStreamChannel success', result);
    } catch (status: any) {
      log.error('createStreamChannel error', status);
    }
  };

  /**
   * Step 3 : join
   */
  const join = async () => {
    try {
      if (!streamChannel) {
        log.error('please create streamChannel first');
        return;
      }
      let result = await streamChannel.join(
        new JoinChannelOptions({
          token: Config.token,
        })
      );
      setJoinSuccess(true);
      log.info('join success', result);
    } catch (status: any) {
      log.error('join error', status);
    }
  };

  /**
   * Step 4 : leave
   */
  const leave = async () => {
    try {
      if (!streamChannel) {
        log.error('please create streamChannel first');
        return;
      }
      let result = await streamChannel.leave();
      setJoinSuccess(false);
      log.info('leave success', result);
    } catch (status: any) {
      log.error('leave error', status);
    }
  };

  /**
   * Step 5 : destroyStreamChannel
   */
  const destroyStreamChannel = useCallback(() => {
    streamChannel?.release();
    setStreamChannel(undefined);
    log.info('destroyStreamChannel success');
  }, [streamChannel]);

  const handleLoginStatus = useCallback((status: boolean) => {
    setLoginSuccess(status);
    if (!status) {
      setStreamChannel(undefined);
      setJoinSuccess(false);
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={AgoraStyle.fullSize}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={AgoraStyle.fullSize}>
        <BaseComponent
          onChannelNameChanged={(v) => setCName(v)}
          onLoginStatusChanged={handleLoginStatus}
        />
        
        <AgoraTextInput
          onChangeText={(text: string) => {
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
          disabled={!loginSuccess}
        />
        
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
                Config.token = newToken;
                
                log.info('Token generated successfully');
              } else {
                throw new Error('Invalid token response format');
              }
            } catch (error: any) {
              log.error('Failed to generate token', error.message);
            }
          }}
          disabled={!loginSuccess || !Config.tokenGenerationUrl}
        />
        <AgoraButton
          disabled={!loginSuccess}
          title={`${
            streamChannel ? 'destroyStreamChannel' : 'createStreamChannel'
          }`}
          onPress={async () => {
            streamChannel
              ? destroyStreamChannel()
              : await createStreamChannel();
          }}
        />
        <AgoraButton
          disabled={!loginSuccess || !streamChannel}
          title={`${joinSuccess ? 'leaveChannel' : 'joinChannel'}`}
          onPress={async () => {
            joinSuccess ? await leave() : await join();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
