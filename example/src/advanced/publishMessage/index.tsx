import { Buffer } from 'buffer';

import {
  MessageEvent,
  PublishOptions,
  RtmChannelType,
  RtmMessageType,
  useRtm,
} from 'agora-react-native-rtm';
import React, { useCallback, useState } from 'react';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';

import BaseComponent from '../../components/BaseComponent';
import {
  AgoraButton,
  AgoraDivider,
  AgoraDropdown,
  AgoraStyle,
  AgoraSwitch,
  AgoraTextInput,
  AgoraView,
} from '../../components/ui';
import Config from '../../config/agora.config';
import { AgoraMessage } from '../../types';
import { enumToItems } from '../../utils';
import * as log from '../../utils/log';

export default function PublishMessage() {
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [storeInHistory, setStoreInHistory] = useState(false);
  const [publishMessageByBuffer, setPublishMessageByBuffer] = useState(false);
  const [cName, setCName] = useState<string>(Config.channelName);
  const [channelType, setChannelType] = useState<number>(
    RtmChannelType.message
  );
  const [uid] = useState<string>(Config.uid);
  const [messages, setMessages] = useState<AgoraMessage[]>([]);
  const [token, setToken] = useState<string>('');
  const [loginExpireTime, setLoginExpireTime] = useState<number>(Config.loginExpireTime || 1800);

  /**
   * Step 1: getRtmClient and initialize rtm client from BaseComponent
   */
  const client = useRtm();

  /**
   * Step 2 : publish message to message channel
   */
  const publish = useCallback(
    async (msg: AgoraMessage, msgs: AgoraMessage[]) => {
      try {
        if (publishMessageByBuffer) {
          let result = await client.publish(
            cName,
            new Uint8Array(Buffer.from(msg.text)),
            new PublishOptions({
              channelType: channelType,
              messageType: RtmMessageType.binary,
              storeInHistory: storeInHistory,
            })
          );
          log.info('publish success', result);
        } else {
          let result = await client.publish(
            cName,
            msg.text,
            new PublishOptions({
              channelType: channelType,
              messageType: RtmMessageType.string,
              storeInHistory: storeInHistory,
            })
          );
          log.info('publish success', result);
        }
        msg.sent = true;
        setMessages((previousMessages) =>
          GiftedChat.append(previousMessages, msgs)
        );
      } catch (err) {
        msg.sent = false;
        log.error('publish error', err);
        return;
      }
    },
    [cName, client, publishMessageByBuffer, channelType, storeInHistory]
  );

  const onSend = useCallback(
    (msgs: IMessage[] = []) => {
      if (!loginSuccess) {
        log.error('please login first');
        return;
      }

      msgs.forEach((message: IMessage) => {
        publish(message, msgs);
      });
    },
    [loginSuccess, publish]
  );

  /**
   * Step 3(optional) : subscribe message channel
   */
  const subscribe = async () => {
    try {
      let result = await client.subscribe(cName, {
        withMessage: true,
        withMetadata: true,
        withPresence: true,
        withLock: true,
      });
      setSubscribeSuccess(true);
      log.info('subscribe success', result);
    } catch (status: any) {
      log.error('subscribe error', status);
    }
  };

  /**
   * Step 4 : unsubscribe message channel
   */
  const unsubscribe = async () => {
    try {
      let result = await client.unsubscribe(cName);
      setSubscribeSuccess(false);
      log.info('unsubscribe success', result);
    } catch (status: any) {
      log.error('unsubscribe error', status);
    }
  };

  const handleMessage = (message: MessageEvent) => {
    log.info('message', message);
    setMessages((prevState) =>
      GiftedChat.append(prevState, [
        {
          _id: +new Date(),
          text: message.message!,
          user: {
            _id: +new Date(),
            name: message.publisher || uid.slice(-1),
          },
          createdAt: new Date(),
        },
      ])
    );
  };

  /**
   * Step 5: renew token
   */
  const renewToken = async () => {
    try {
      let result = await client.renewToken(token);
      log.info('renewToken success', result);
    } catch (status: any) {
      log.error('renewToken error', status);
    }
  };

  const handleLoginStatus = useCallback((status: boolean) => {
    setLoginSuccess(status);
    if (!status) {
      setSubscribeSuccess(false);
    }
  }, []);

  return (
    <>
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
          title="Renew Token"
          onPress={renewToken}
          disabled={!loginSuccess || !token}
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
                setToken(newToken);
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
      </AgoraView>
      <AgoraView style={AgoraStyle.fullWidth}>
        <BaseComponent
          onChannelNameChanged={(v) => setCName(v)}
          onLoginStatusChanged={handleLoginStatus}
          onMessage={handleMessage}
        />
        <AgoraDivider />
        <AgoraDropdown
          items={enumToItems(RtmChannelType)}
          onValueChange={(v) => {
            setChannelType(v);
          }}
          title="select channelType"
          value={channelType}
        />
        <AgoraButton
          disabled={!loginSuccess}
          title={`${subscribeSuccess ? 'unsubscribe' : 'subscribe'}`}
          onPress={async () => {
            subscribeSuccess ? await unsubscribe() : await subscribe();
          }}
        />
        <AgoraSwitch
          value={storeInHistory}
          onValueChange={(v) => setStoreInHistory(v)}
          title="storeInHistory"
        />
      </AgoraView>
      <AgoraButton
        title={`current: publish${
          publishMessageByBuffer ? 'ByBuffer' : 'ByString'
        }`}
        onPress={() => {
          setPublishMessageByBuffer((v) => !v);
        }}
      />
      <GiftedChat
        wrapInSafeArea={false}
        messages={messages}
        onSend={(v) => onSend(v)}
        user={{
          _id: uid,
        }}
      />
    </>
  );
}
