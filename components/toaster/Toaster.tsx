// ~/components/toaster/Toaster.tsx
import React from 'react';
import { View, Platform, StatusBar as RNStatusBar, ViewStyle, TextStyle } from 'react-native';
import { Toaster as SonnerToasterComponent, toast as sonnerNativeToastObject } from 'sonner-native'; // Import both

interface CustomToastOptions {
  style?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
  success?: { style?: ViewStyle; };
  error?: { style?: ViewStyle; };
  info?: { style?: ViewStyle; };
  warning?: { style?: ViewStyle; };
}

export const toasterOptionsConfig: CustomToastOptions = {
  style: { /* ... your styles ... */ },
  titleStyle: { /* ... your styles ... */ },
  descriptionStyle: { /* ... your styles ... */ },
  success: { style: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', } },
  error: { style: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', } },
  info: { style: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', } },
  warning: { style: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', } },
};

const toasterContainerStyle: ViewStyle = {
  position: 'absolute',
  top: Platform.OS === 'ios' ? (RNStatusBar.currentHeight || 0) + 10 : 10,
  left: 0,
  right: 0,
  zIndex: 10000, // Ensure it's on top
};

// This is the component that renders the Toaster UI
const GlobalToaster: React.FC = () => {
  return (
    <View style={toasterContainerStyle} pointerEvents="box-none">
      <SonnerToasterComponent // Use the imported component
        position="top-center"
        toastOptions={toasterOptionsConfig}
      />
    </View>
  );
};

// This is the object with methods to trigger toasts (e.g., Toaster.success, Toaster.error)
export const Toaster = sonnerNativeToastObject; // Re-export sonner-native's toast object

export default GlobalToaster; // Default export is the UI component