import React from 'react';
import { View, ScrollView, TouchableOpacity, ImageBackground, useColorScheme as rnColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { ShoppingBag, Tag, Users, ChevronRight } from 'lucide-react-native';
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

    // Fallback to simpler card if no imageUri
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

export default function InventoryHubScreen() {
    const router = useRouter();
    const { isDarkColorScheme } = useColorScheme();
    const currentRNColorScheme = rnColorScheme();
    const COLORS = getColors(currentRNColorScheme || 'light');

    const primaryColor = isDarkColorScheme ? '#A78BFA' : '#7C3AED';
    const accentColors = {
        products: isDarkColorScheme ? 'rgba(167, 139, 250, 0.2)' : 'rgba(124, 58, 237, 0.1)',
        categories: isDarkColorScheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        customers: isDarkColorScheme ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.1)',
        reports: isDarkColorScheme ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
    };

    const hubItems: HubItemProps[] = [
        {
            title: 'Manage Products',
            description: 'View, add, edit, or delete products in your inventory.',
            icon: <ShoppingBag size={24} color={primaryColor} />,
            onPress: () => router.push('/(tabs)/inventory/products'),
            imageUri: 'https://images.pexels.com/photos/6169641/pexels-photo-6169641.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            iconBgColor: accentColors.products,
        },
        {
            title: 'Product Categories',
            description: 'Organize your products by creating and managing categories.',
            icon: <Tag size={24} color="#3B82F6" />,
            onPress: () => router.push('/(tabs)/inventory/category'),
            imageUri: 'https://images.unsplash.com/photo-1556909172-6ab63f18fd12?q=80&w=2070&auto=format&fit=crop',
            iconBgColor: accentColors.categories,
        },
        {
            title: 'Customer List',
            description: 'Access and manage your customer information and history.',
            icon: <Users size={24} color="#EAB308" />,
            onPress: () => router.push('/(tabs)/inventory/customers'),
            imageUri: 'https://images.pexels.com/photos/6214370/pexels-photo-6214370.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            iconBgColor: accentColors.customers,
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
                        {/* <Text className="text-3xl font-bold text-foreground">Inventory Hub</Text> */}
                        <Text className="text-base text-muted-foreground mt-1">
                            Manage all aspects of your store's inventory from one place.
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

                    <View className="mt-8 mb-4 items-center">
                        <Text className="text-sm text-muted-foreground">
                            More inventory features coming soon!
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}