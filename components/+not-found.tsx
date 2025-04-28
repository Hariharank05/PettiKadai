import { Link } from 'expo-router'; // Removed Stack import
import { View } from 'react-native';
import { Text } from '~/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context'; // Use SafeAreaView for better spacing

export default function NotFoundScreen() {
  return (
    // Removed Stack.Screen options as Stack is no longer the root
    <SafeAreaView className="flex-1 items-center justify-center p-4">
      <View className="items-center gap-4">
        <Text className="text-2xl font-bold">Oops!</Text>
        <Text className="text-center">This screen doesn't exist.</Text>
        <Link href='/home' // Link to the home tab
           className="mt-4 py-2 px-4 bg-primary rounded-md"
        >
          <Text className="text-primary-foreground">Go to home screen!</Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}