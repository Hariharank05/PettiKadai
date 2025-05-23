// ~/components/auth/ChangePasswordModal.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, Platform } from 'react-native';
import { Text } from '~/components/ui/text';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Eye, EyeOff, Key } from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

export function ChangePasswordModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
}: ChangePasswordModalProps) {
  const { isDarkColorScheme } = useColorScheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    const result = await onSubmit(currentPassword, newPassword);
    if (result.success) {
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setError(result.message || 'Failed to change password.');
    }
  };

  const handleClose = () => {
    setError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    content: {
      backgroundColor: isDarkColorScheme ? '#252525' : '#fff',
      borderRadius: 10,
      padding: 20,
      width: '100%',
      maxWidth: 380,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    titleText: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      color: isDarkColorScheme ? '#e0e0e0' : '#222',
      textAlign: 'center',
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: isDarkColorScheme ? '#909090' : '#555555',
      marginBottom: 6,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 16,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 6,
    },
    cancelButtonText: {
      color: isDarkColorScheme ? '#9CA3AF' : '#6B7280',
      fontSize: 16,
      fontWeight: '500',
    },
    submitButton: {
      backgroundColor: isDarkColorScheme ? '#00AEEF' : '#007AFF',
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    errorText: {
      color: '#EF4444',
      textAlign: 'center',
      marginBottom: 10,
      fontSize: 14,
    },
    inputWrapper: {
      position: 'relative',
    },
    eyeIcon: {
      position: 'absolute',
      right: 12,
      top: Platform.OS === 'ios' ? 12 : 14,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Key size={22} color={isDarkColorScheme ? '#00AEEF' : '#007AFF'} style={{ marginRight: 8 }} />
            <Text style={styles.titleText}>Change Password</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputWrapper}>
              <Input
                placeholder="Enter your current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                className="h-12 pr-12"
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                {showCurrentPassword ? (
                  <EyeOff size={20} color={isDarkColorScheme ? '#909090' : '#555555'} />
                ) : (
                  <Eye size={20} color={isDarkColorScheme ? '#909090' : '#555555'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Input
                placeholder="Enter new password (min. 8 chars)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                className="h-12 pr-12"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                {showNewPassword ? (
                  <EyeOff size={20} color={isDarkColorScheme ? '#909090' : '#555555'} />
                ) : (
                  <Eye size={20} color={isDarkColorScheme ? '#909090' : '#555555'} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Password</Text>
            <Input
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry={!showNewPassword}
              className="h-12"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={handleClose} disabled={isLoading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isLoading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}