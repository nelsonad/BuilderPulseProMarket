import React, {useMemo, useState} from 'react';
import {Image, Linking, Modal, ScrollView, View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
import {apiBaseUrl} from '../constants';
import {JobAttachment} from '../types';
import {styles} from '../styles';
import {WebView} from 'react-native-webview';

type AttachmentViewerProps = {
  attachments: JobAttachment[];
  emptyMessage?: string;
};

const previewableExtensions = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'pdf',
]);

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

  const resolvedAttachmentUrl = useMemo(() => {
    if (!selectedAttachment) {
      return '';
    }

    return resolveAttachmentUrl(selectedAttachment);
  }, [selectedAttachment]);

  const isPreviewable = (attachment: JobAttachment) => {
    const ext = attachment.fileName.split('.').pop()?.toLowerCase() ?? '';
    return previewableExtensions.has(ext);
  };

  const handleAttachmentPress = async (attachment: JobAttachment) => {
    if (isPreviewable(attachment)) {
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
      {attachments.length > 0 ? (
        <View>
          <Text style={styles.label}>Attachments</Text>
          {attachments.map(attachment => (
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
