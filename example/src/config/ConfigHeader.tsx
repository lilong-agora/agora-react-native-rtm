import { Overlay } from '@rneui/themed';

import {
  RtmAreaCode,
  RtmEncryptionMode,
  RtmProxyType,
} from 'agora-react-native-rtm';
import React, { useState } from 'react';

import { ScrollView, StyleSheet } from 'react-native';

import {
  AgoraButton,
  AgoraDivider,
  AgoraDropdown,
  AgoraStyle,
  AgoraTextInput,
} from '../components/ui';
import { enumToItems } from '../utils/index';

import Config from './agora.config';

export const ConfigHeader = ({
  onShow,
  onHide,
}: {
  onShow: () => void;
  onHide: () => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [server, setServer] = useState(Config.server);
  const [port, setPort] = useState<number>(Config.port);
  const [userId, setUserId] = useState<string>(Config.uid);
  const [areaCode, setAreaCode] = useState<number>(Config.areaCode);
  const [proxyType, setProxyType] = useState<RtmProxyType>(Config.proxyType);
  const [encryptionMode, setEncryptionMode] = useState<number>(
    Config.encryptionMode
  );
  const [encryptionKey, setEncryptionKey] = useState<string>(
    Config.encryptionKey
  );
  const [appId, setAppId] = useState<string>(Config.appId);
  const [reconnectTimeout, setReconnectTimeout] = useState<number>(
    Config.reconnectTimeout
  );

  const toggleOverlay = () => {
    onShow();
    setVisible(!visible);
  };

  return (
    <>
      <AgoraButton title="Config" onPress={toggleOverlay} />
      {visible && (
        <>
          <Overlay
            isVisible
            onBackdropPress={() => {
              setVisible(false);
              onHide();
            }}
            overlayStyle={styles.overlay}
          >
            <ScrollView style={AgoraStyle.fullSize}>
              <AgoraTextInput
                onChangeText={(text) => {
                  setAppId(text);
                  Config.appId = text;
                }}
                placeholder="please input appId"
                label="appId"
                value={appId}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setUserId(text);
                  Config.uid = text;
                }}
                placeholder="please input userId"
                label="userId"
                value={userId}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setCertificate(text);
                  Config.certificate = text;
                }}
                placeholder="please input certificate"
                label="certificate"
                value={certificate}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  const intValue = parseInt(text, 10) || 0;
                  setLoginExpireTime(intValue);
                  Config.loginExpireTime = intValue;
                }}
                placeholder="please input login expire time"
                label="login expire time"
                value={loginExpireTime.toString()}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setReadChannels(text);
                  Config.readChannels = text;
                }}
                placeholder="please input read channels (comma separated)"
                label="read channels"
                value={readChannels}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setWriteChannels(text);
                  Config.writeChannels = text;
                }}
                placeholder="please input write channels (comma separated)"
                label="write channels"
                value={writeChannels}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setTokenGenerationUrl(text);
                  Config.tokenGenerationUrl = text;
                }}
                placeholder="please input token generation URL"
                label="token generation URL"
                value={tokenGenerationUrl}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setBasicAuthValue(text);
                  Config.basicAuthValue = text;
                }}
                placeholder="please input Basic Auth value (without 'Basic ' prefix)"
                label="basic auth value"
                value={basicAuthValue}
              />
              <AgoraDivider />
              <AgoraButton 
                title="Generate & Set Token" 
                onPress={async () => {
                  try {
                    // Check if token generation is configured
                    if (!Config.tokenGenerationUrl) {
                      return;
                    }

                    if (!Config.appId || !Config.certificate || !Config.uid) {
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
                      Config.token = data.rtmToken;
                      console.log('Token generated and set successfully');
                    } else {
                      throw new Error('Invalid token response format');
                    }
                  } catch (error: any) {
                    console.error(`Failed to generate token: ${error.message}`);
                  }
                }}
              />
              <AgoraDivider />

              <AgoraDropdown
                items={enumToItems(RtmProxyType)}
                onValueChange={(v) => {
                  setProxyType(v);
                  Config.proxyType = v;
                }}
                title="select proxyType"
                value={proxyType}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setServer(text);
                  Config.server = text;
                }}
                placeholder="please input server"
                label="server"
                value={server}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  if (!text) return;
                  setPort(parseInt(text, 10));
                  Config.port = parseInt(text, 10);
                }}
                placeholder="please input port"
                label="port"
                value={port?.toString()}
              />
              <AgoraDivider />
              <AgoraDropdown
                items={enumToItems(RtmAreaCode)}
                onValueChange={(v) => {
                  setAreaCode(v);
                  Config.areaCode = v;
                }}
                title="select areaCode"
                value={areaCode}
              />
              <AgoraDivider />
              <AgoraDropdown
                items={enumToItems(RtmEncryptionMode)}
                onValueChange={(v) => {
                  setEncryptionMode(v);
                  Config.encryptionMode = v;
                }}
                title="select encryptionMode"
                value={encryptionMode}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  setEncryptionKey(text);
                  Config.encryptionKey = text;
                }}
                placeholder="please input encryptionKey"
                label="encryptionKey"
                value={encryptionKey}
              />
              <AgoraDivider />
              <AgoraTextInput
                onChangeText={(text) => {
                  if (!text) return;
                  setReconnectTimeout(parseInt(text, 10));
                  Config.reconnectTimeout = parseInt(text, 10);
                }}
                placeholder="please input reconnectTimeout"
                label="reconnectTimeout"
                value={reconnectTimeout?.toString()}
              />
              <AgoraDivider />
            </ScrollView>
          </Overlay>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    width: '100%',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
  },
  overlay: {
    backgroundColor: 'white',
    width: '100%',
    minHeight: 250,
    maxHeight: 500,
  },
});
