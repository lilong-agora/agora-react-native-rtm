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
  const [certificate, setCertificate] = useState<string>(Config.certificate);
  const [readChannels, setReadChannels] = useState<string>(Config.readChannels);
  const [writeChannels, setWriteChannels] = useState<string>(Config.writeChannels);
  const [tokenGenerationUrl, setTokenGenerationUrl] = useState<string>(Config.tokenGenerationUrl);
  const [basicAuthValue, setBasicAuthValue] = useState<string>(Config.basicAuthValue);
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
