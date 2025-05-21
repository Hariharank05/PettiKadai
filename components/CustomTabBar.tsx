// ~/components/CustomTabBar.tsx
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useAnimatedProps } from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg'; // Import Svg and Path
import { Home, Archive, ShoppingCart, History as HistoryIcon, User, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// Configuration
const TAB_BAR_COLOR = '#f9c00c';
const ICON_COLOR_INACTIVE = 'white';
const ICON_COLOR_ACTIVE = 'white';
const ACTIVE_BUBBLE_BORDER_COLOR = 'white';
const TAB_BAR_CONTENT_HEIGHT = 65; // Visual height for icons area inside the bar
const BUBBLE_SIZE = 75;
const ICON_SIZE = 26;
const BUBBLE_BORDER_WIDTH = 5;

// Notch / Wave Configuration
const BUBBLE_OVERHANG = BUBBLE_SIZE / 3.8; // How much the bubble sticks out from the top flat edge
const NOTCH_WIDTH = BUBBLE_SIZE * 1.35;  // Width of the curved notch (wider than bubble)
const NOTCH_DEPTH = BUBBLE_SIZE / 2.4; // How deep the curve dips
// Factor for Bezier curve control points to shape the curve's "roundness"
const NOTCH_CURVE_RADIUS_FACTOR = NOTCH_WIDTH * 0.3;

// Create an Animated version of Svg Path
const AnimatedPath = Animated.createAnimatedComponent(Path);

const iconMap: { [key: string]: { component: React.ElementType, label?: string } } = {
    home: { component: Home, label: 'Dashboard' },
    inventory: { component: Archive, label: 'Inventory' },
    sales: { component: ShoppingCart, label: 'Sales' },
    receipts: { component: HistoryIcon, label: 'Receipts' },
    profile: { component: User, label: 'Profile' },
    settings: { component: Settings, label: 'Settings' },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const { routes, index: activeIndex } = state;
    const numTabs = routes.length;
    const tabWidth = screenWidth / numTabs;
    const bottomInset = insets.bottom;

    const translateX = useSharedValue(0); // For bubble's horizontal position
    const bubbleScale = useSharedValue(1);

    useEffect(() => {
        const targetBubbleX = activeIndex * tabWidth + (tabWidth - BUBBLE_SIZE) / 2;
        translateX.value = withTiming(targetBubbleX, {
            duration: 350,
            easing: Easing.out(Easing.cubic),
        });

        bubbleScale.value = withTiming(0.8, { duration: 100, easing: Easing.out(Easing.ease) }, (finished) => {
            if (finished) {
                bubbleScale.value = withTiming(1, { duration: 200, easing: Easing.elastic(1.2) });
            } else {
                bubbleScale.value = 1;
            }
        });
    }, [activeIndex, tabWidth, translateX, bubbleScale, routes.length]);

    const animatedBubbleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }, { scale: bubbleScale.value }],
        };
    });

    // Total height of the component, including safe area and overhang
    const totalComponentHeight = TAB_BAR_CONTENT_HEIGHT + bottomInset + BUBBLE_OVERHANG;
    // Height of the SVG element, which matches totalComponentHeight for positioning
    const svgHeight = totalComponentHeight;


    // Animated SVG Path props
    const animatedPathProps = useAnimatedProps(() => {
        // yTop is the y-coordinate of the flat top edge of the tab bar, from the SVG's top (0,0)
        const yTop = BUBBLE_OVERHANG;
        // yBarBottom is the y-coordinate of the bottom edge of the tab bar
        const yBarBottom = yTop + TAB_BAR_CONTENT_HEIGHT + bottomInset;

        // translateX.value is the left edge of the *bubble*. Notch is centered around bubble.
        const currentNotchCenterX = translateX.value + BUBBLE_SIZE / 2;

        const x1_notchStart = currentNotchCenterX - NOTCH_WIDTH / 2;
        const x3_notchEnd = currentNotchCenterX + NOTCH_WIDTH / 2;
        const midX_notchCenter = currentNotchCenterX;
        const y_notchBottom = yTop + NOTCH_DEPTH;
        const r_curve = NOTCH_CURVE_RADIUS_FACTOR;

        const d = `
      M 0 ${yTop}
      L ${x1_notchStart} ${yTop}
      C ${x1_notchStart + r_curve} ${yTop}, ${midX_notchCenter - r_curve} ${y_notchBottom}, ${midX_notchCenter} ${y_notchBottom}
      C ${midX_notchCenter + r_curve} ${y_notchBottom}, ${x3_notchEnd - r_curve} ${yTop}, ${x3_notchEnd} ${yTop}
      L ${screenWidth} ${yTop}
      L ${screenWidth} ${yBarBottom}
      L 0 ${yBarBottom}
      Z
    `;
        return { d };
    });

    return (
        <View style={[styles.outerContainer, { height: totalComponentHeight }]}>
            {/* SVG Background with Wave/Notch */}
            <View style={styles.svgContainerWithShadow}>
                <Svg width={screenWidth} height={svgHeight} style={styles.svgElement}>
                    <AnimatedPath fill={TAB_BAR_COLOR} animatedProps={animatedPathProps} />
                </Svg>
            </View>

            {/* Tab Items (Pressables with inactive icons) */}
            <View style={styles.tabItemsContainer}>
                {routes.map((route, i) => {
                    const { options } = descriptors[route.key] as { options: BottomTabNavigationOptions };
                    const isFocused = activeIndex === i;
                    const iconInfo = iconMap[route.name];
                    const IconComponent = iconInfo?.component;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params as any);
                        }
                    };
                    const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

                    return (
                        <Pressable
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel || iconInfo?.label}
                            testID={(options as any).tabBarTestID} onPress={onPress}
                            onLongPress={onLongPress}
                            style={[styles.tabItem, { width: tabWidth }]} // Height is from container
                        >
                            {IconComponent && !isFocused && (
                                <IconComponent color={ICON_COLOR_INACTIVE} size={ICON_SIZE} />
                            )}
                        </Pressable>
                    );
                })}
            </View>

            {/* Animated Bubble with Active Icon */}
            <Animated.View style={[styles.bubble, animatedBubbleStyle, { top: 0 /* Aligns to top of outerContainer */ }]}>
                {(() => {
                    const activeRoute = routes[activeIndex];
                    if (!activeRoute) return null;
                    const iconInfo = iconMap[activeRoute.name];
                    const IconComponent = iconInfo?.component;
                    return IconComponent ? <IconComponent color={ICON_COLOR_ACTIVE} size={ICON_SIZE} /> : null;
                })()}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent', // Essential for the overhang and SVG shape
    },
    svgContainerWithShadow: { // This View holds the SVG and attempts to carry the shadow
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        // Shadow props
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 }, // Adjusted shadow
        shadowOpacity: 0.18,
        shadowRadius: 5,
        elevation: 12, // For Android
    },
    svgElement: {
        // The Svg element itself. No explicit background color needed here.
    },
    tabItemsContainer: { // Container for the pressable tab items (icons)
        position: 'absolute',
        top: BUBBLE_OVERHANG, // Position icons on the "flat" part of the bar
        left: 0,
        right: 0,
        height: TAB_BAR_CONTENT_HEIGHT, // Height for the icon area
        flexDirection: 'row',
        alignItems: 'center', // Vertically center icons within this height
        // backgroundColor: 'rgba(0,255,0,0.2)', // For debugging alignment
    },
    tabItem: {
        flex: 1,
        height: '100%', // Take full height of tabItemsContainer
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubble: {
        position: 'absolute', // Positioned relative to outerContainer
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: TAB_BAR_COLOR, // Bubble itself can have the same color
        borderColor: ACTIVE_BUBBLE_BORDER_COLOR,
        borderWidth: BUBBLE_BORDER_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for the bubble (distinct from bar shadow)
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 12, // Should be higher than svgContainerWithShadow
    },
});

export default CustomTabBar;