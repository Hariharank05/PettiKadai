// app/(tabs)/sales/index.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { ShoppingCart, History as HistoryIcon, ChevronRight } from 'lucide-react-native'; // Renamed History to HistoryIcon
import { useColorScheme } from '~/lib/useColorScheme';

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
                    className="rounded-xl overflow-hidden h-36 justify-end"
                    resizeMode="cover"
                >
                    <View className="p-4 bg-black/50">
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
    const primaryColor = isDarkColorScheme ? '#A78BFA' : '#7C3AED'; // Example primary color
    const secondaryColor = isDarkColorScheme ? '#60A5FA' : '#3B82F6'; // Example secondary color

    const accentColors = {
        pos: isDarkColorScheme ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.1)', // purple-ish
        receipts: isDarkColorScheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)', // blue-ish
    };

    const hubItems: HubItemProps[] = [
        {
            title: 'Sales Management',
            description: 'Create new sales, add items to cart, and process payments.',
            icon: <ShoppingCart size={24} color={primaryColor} />,
            onPress: () => router.push('/(tabs)/sale/sales-management'),
            imageUri: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=2070&auto=format&fit=crop', // POS image
            iconBgColor: accentColors.pos,
        },
        {
            title: 'Receipts History',
            description: 'View, share, or reprint past sales receipts.',
            icon: <HistoryIcon size={24} color={secondaryColor} />,
            onPress: () => router.push('/(tabs)/sale/receipts'),
            imageUri: 'https://images.unsplash.com/photo-1583344079424-c3aa06cabd6f?q=80&w=1974&auto=format&fit=crop', // Receipts/history image
            iconBgColor: accentColors.receipts,
        },
    ];

    return (
        <ScrollView className="flex-1 bg-background">
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
    );
}