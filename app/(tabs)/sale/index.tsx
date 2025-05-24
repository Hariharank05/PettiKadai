import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, useColorScheme as rnColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { ShoppingCart, History as HistoryIcon, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from '~/lib/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

// Define the color palette based on theme
export const getColors = (colorScheme: 'light' | 'dark') => ({
    primary: colorScheme === 'dark' ? '#a855f7' : '#7200da',
    secondary: colorScheme === 'dark' ? '#22d3ee' : '#00b9f1',
    accent: '#f9c00c',
    danger: colorScheme === 'dark' ? '#ff4d4d' : '#f9320c',
    lightPurple: colorScheme === 'dark' ? '#4b2e83' : '#e9d5ff',
    lightBlue: colorScheme === 'dark' ? '#164e63' : '#d0f0ff',
    lightYellow: colorScheme === 'dark' ? '#854d0e' : '#fff3d0',
    lightRed: colorScheme === 'dark' ? '#7f1d1d' : '#ffe5e0',
    white: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
    dark: colorScheme === 'dark' ? '#e5e7eb' : '#1a1a1a',
    gray: colorScheme === 'dark' ? '#9ca3af' : '#666',
    border: colorScheme === 'dark' ? '#374151' : '#e5e7eb',
    yellow: colorScheme === 'dark' ? '#f9c00c' : '#f9c00c',
});

interface HubItemProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onPress: () => void;
    imageUri?: string;
    iconBgColor?: string;
}

const HubItemCard: React.FC<HubItemProps> = ({ title, description, icon, onPress, imageUri, iconBgColor }) => {
    const { isDarkColorScheme } = useColorScheme();
    const defaultIconBgColor = isDarkColorScheme ? 'bg-primary/20' : 'bg-primary/10';

    if (imageUri) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="mb-4">
                <ImageBackground
                    source={{ uri: imageUri }}
                    className="rounded-xl overflow-hidden h-36"
                    resizeMode="cover"
                >
                    {/* Full mask covering the entire image */}
                    <View className="flex-1 p-4 bg-black/40">
                        <View className="flex-row items-center mb-1">
                            <View className={`p-2 rounded-full mr-3 ${iconBgColor || defaultIconBgColor}`}>
                                {icon}
                            </View>
                            <Text className="text-lg font-bold text-white">{title}</Text>
                        </View>
                        <Text className="text-sm text-gray-200 ml-12" numberOfLines={2}>{description}</Text>
                    </View>
                </ImageBackground>
            </TouchableOpacity>
        );
    }

    const { Card, CardContent } = require('~/components/ui/card');

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <Card className="mb-4 bg-card border border-border shadow-md dark:shadow-gray-700/50">
                <CardContent className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className={`p-3 rounded-full mr-4 ${iconBgColor || defaultIconBgColor}`}>
                            {icon}
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-semibold text-foreground">{title}</Text>
                            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>{description}</Text>
                        </View>
                    </View>
                    <ChevronRight size={20} className="text-muted-foreground" />
                </CardContent>
            </Card>
        </TouchableOpacity>
    );
};

export default function SalesHubScreen() {
    const router = useRouter();
    const { isDarkColorScheme } = useColorScheme();
    const currentRNColorScheme = rnColorScheme();
    const COLORS = getColors(currentRNColorScheme || 'light');

    const primaryColor = isDarkColorScheme ? '#A78BFA' : '#7C3AED';
    const secondaryColor = isDarkColorScheme ? '#60A5FA' : '#3B82F6';

    const accentColors = {
        pos: isDarkColorScheme ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.1)',
        receipts: isDarkColorScheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
    };

    const hubItems: HubItemProps[] = [
        {
            title: 'Sales Management',
            description: 'Create new sales, add items to cart, and process payments.',
            icon: <ShoppingCart size={24} color={primaryColor} />,
            onPress: () => router.push('/(tabs)/sale/sales-management'),
            imageUri: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop',
            iconBgColor: accentColors.pos,
        },
        {
            title: 'Receipts History',
            description: 'View, share, or reprint past sales receipts.',
            icon: <HistoryIcon size={24} color={secondaryColor} />,
            onPress: () => router.push('/(tabs)/sale/receipts'),
            imageUri: 'https://images.pexels.com/photos/12935051/pexels-photo-12935051.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            iconBgColor: accentColors.receipts,
        },
    ];

    return (
        <LinearGradient
            colors={[COLORS.white, COLORS.yellow]}
            style={{ flex: 1 }}
        >
            <ScrollView className="flex-1 bg-transparent">
                <View className="p-4 pt-6">
                    <View className="mb-6">
                        <Text className="text-3xl font-bold text-foreground">Sales Hub</Text>
                        <Text className="text-base text-muted-foreground mt-1">
                            Manage your sales operations and view transaction history.
                        </Text>
                    </View>

                    <View>
                        {hubItems.map((item, index) => (
                            <HubItemCard
                                key={index}
                                title={item.title}
                                description={item.description}
                                icon={item.icon}
                                onPress={item.onPress}
                                imageUri={item.imageUri}
                                iconBgColor={item.iconBgColor}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}