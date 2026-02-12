import React, {useMemo, useState} from 'react';
import {Image, Linking, Modal, ScrollView, View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
import {apiBaseUrl} from '../constants';
import {JobAttachment} from '../types';
import {styles} from '../styles';
import {WebView} from 'react-native-webview';
import {
  isAllowedAttachmentFileName,
  isPreviewableAttachmentFileName,
} from '../utils/attachments';

type AttachmentViewerProps = {
  attachments: JobAttachment[];
  emptyMessage?: string;
};

const resolveAttachmentUrl = (attachment: JobAttachment) => {
  if (!attachment.url) {
    return '';
  }

  if (attachment.url.startsWith('http')) {
    return attachment.url;
  }

  return `${apiBaseUrl}${attachment.url.startsWith('/') ? '' : '/'}${attachment.url}`;
};

const resolveDownloadUrl = (attachment: JobAttachment) => {
  const resolvedUrl = resolveAttachmentUrl(attachment);
  if (!resolvedUrl) {
    return '';
  }

  const separator = resolvedUrl.includes('?') ? '&' : '?';
  return `${resolvedUrl}${separator}download=true`;
};

const AttachmentViewer = ({
  attachments,
  emptyMessage = 'No attachments uploaded yet.',
}: AttachmentViewerProps) => {
  const [selectedAttachment, setSelectedAttachment] =
    useState<JobAttachment | null>(null);

  const allowedAttachments = useMemo(
    () =>
      attachments.filter(attachment =>
        isAllowedAttachmentFileName(attachment.fileName),
      ),
    [attachments],
  );

  const resolvedAttachmentUrl = useMemo(() => {
    if (!selectedAttachment) {
      return '';
    }

    return resolveAttachmentUrl(selectedAttachment);
  }, [selectedAttachment]);

  const handleAttachmentPress = async (attachment: JobAttachment) => {
    if (!isAllowedAttachmentFileName(attachment.fileName)) {
      return;
    }

    if (isPreviewableAttachmentFileName(attachment.fileName)) {
      setSelectedAttachment(attachment);
      return;
    }

    const resolvedUrl = resolveDownloadUrl(attachment);
    if (!resolvedUrl) {
      return;
    }

    await Linking.openURL(resolvedUrl);
  };

  return (
    <View style={{marginTop: 16}}>
      {allowedAttachments.length > 0 ? (
        <View>
          <Text style={styles.label}>Attachments</Text>
          {allowedAttachments.map(attachment => (
            <Button
              key={attachment.id}
              mode="outlined"
              onPress={() => handleAttachmentPress(attachment)}
              style={{marginBottom: 8}}>
              {attachment.fileName}
            </Button>
          ))}
        </View>
      ) : (
        <Text style={styles.body}>{emptyMessage}</Text>
      )}
      <Modal
        visible={Boolean(selectedAttachment)}
        animationType="slide"
        onRequestClose={() => setSelectedAttachment(null)}
        transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 16,
          }}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.title}>
                {selectedAttachment?.fileName ?? 'Attachment'}
              </Text>
              <ScrollView style={{maxHeight: 500, marginTop: 12}}>
                {selectedAttachment && resolvedAttachmentUrl ? (
                  selectedAttachment.fileName
                    .toLowerCase()
                    .endsWith('.pdf') ? (
                    <WebView
                      source={{uri: resolvedAttachmentUrl}}
                      style={{height: 400}}
                    />
                  ) : (
                    <Image
                      source={{uri: resolvedAttachmentUrl}}
                      style={{width: '100%', height: 300}}
                      resizeMode="contain"
                    />
                  )
                ) : null}
              </ScrollView>
              <View style={{marginTop: 16}}>
                <Button
                  mode="contained"
                  onPress={async () => {
                    if (!selectedAttachment) {
                      return;
                    }
                    if (!isAllowedAttachmentFileName(selectedAttachment.fileName)) {
                      return;
                    }
                    const downloadUrl = resolveDownloadUrl(selectedAttachment);
                    if (!downloadUrl) {
                      return;
                    }
                    await Linking.openURL(downloadUrl);
                  }}>
                  Download
                </Button>
                <Button
                  mode="text"
                  onPress={() => setSelectedAttachment(null)}
                  style={{marginTop: 8}}>
                  Close
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

export default AttachmentViewer;
