// ~/components/CustomTabBar.tsx
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import { BottomTabBarProps, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useAnimatedProps } from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg';
import { Home, Archive, ShoppingCart, Settings, NotebookText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// Configuration (adjust these as needed)
const TAB_BAR_COLOR = '#f9c00c';
const ICON_COLOR_INACTIVE = 'white';
const ICON_COLOR_ACTIVE = 'white';
const ACTIVE_BUBBLE_BORDER_COLOR = 'white';
const TAB_BAR_CONTENT_HEIGHT = 65;
const BUBBLE_SIZE = 75;
const ICON_SIZE = 26;
const BUBBLE_BORDER_WIDTH = 5;

// BUBBLE_OVERHANG:
const BUBBLE_OVERHANG = BUBBLE_SIZE / 3.8;
const NOTCH_WIDTH = BUBBLE_SIZE * 1.35;
const NOTCH_DEPTH = BUBBLE_SIZE / 2.4;
const NOTCH_CURVE_RADIUS_FACTOR = NOTCH_WIDTH * 0.1;

const AnimatedPath = Animated.createAnimatedComponent(Path);

const iconMap: { [key: string]: { component: React.ElementType, label?: string } } = {
    home: { component: Home, label: 'Dashboard' },
    inventory: { component: Archive, label: 'Inventory' },
    sale: { component: ShoppingCart, label: 'Sales' },
    ReportsScreen: { component: NotebookText, label: 'Reports' },
    setting: { component: Settings, label: 'Settings' },
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const { routes, index: activeIndex } = state;
    const numTabs = routes.length;
    const tabWidth = screenWidth / numTabs;
    const bottomInset = insets.bottom;

    // This is the height the tab bar will occupy in the normal layout flow.
    // Screen content will naturally be pushed up by this amount.
    const occupiedHeightInLayout = TAB_BAR_CONTENT_HEIGHT + bottomInset;

    // Total visual height of the SVG canvas, including the overhang.
    const svgTotalVisualHeight = occupiedHeightInLayout + BUBBLE_OVERHANG;

    const translateX = useSharedValue(0);
    const bubbleScale = useSharedValue(1);

    useEffect(() => {
        const targetBubbleX = activeIndex * tabWidth + (tabWidth - BUBBLE_SIZE) / 2;
        translateX.value = withTiming(targetBubbleX, {
            duration: 350,
            easing: Easing.out(Easing.cubic),
        });
        bubbleScale.value = withTiming(0.8, { duration: 100, easing: Easing.out(Easing.ease) }, (finished) => {
            if (finished) bubbleScale.value = withTiming(1, { duration: 200, easing: Easing.elastic(1.2) });
            else bubbleScale.value = 1;
        });
    }, [activeIndex, tabWidth, translateX, bubbleScale, routes.length]);

    const animatedBubbleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }, { scale: bubbleScale.value }],
        };
    });

    const animatedPathProps = useAnimatedProps(() => {
        const yFlatSurface = BUBBLE_OVERHANG;
        const yNotchDip = yFlatSurface + NOTCH_DEPTH;
        const ySvgBottom = svgTotalVisualHeight;

        const currentNotchCenterX = translateX.value + BUBBLE_SIZE / 2;
        const x1_notchStart = currentNotchCenterX - NOTCH_WIDTH / 2;
        const x3_notchEnd = currentNotchCenterX + NOTCH_WIDTH / 2;
        const r_curve = NOTCH_CURVE_RADIUS_FACTOR;

        const d = `
          M 0 ${yFlatSurface}
          L ${x1_notchStart} ${yFlatSurface}
          C ${x1_notchStart + r_curve} ${yFlatSurface}, ${currentNotchCenterX - r_curve} ${yNotchDip}, ${currentNotchCenterX} ${yNotchDip}
          C ${currentNotchCenterX + r_curve} ${yNotchDip}, ${x3_notchEnd - r_curve} ${yFlatSurface}, ${x3_notchEnd} ${yFlatSurface}
          L ${screenWidth} ${yFlatSurface}
          L ${screenWidth} ${ySvgBottom}
          L 0 ${ySvgBottom}
          Z
        `;
        return { d };
    });

    return (
        // This container is part of the normal layout flow.
        // Its height (`occupiedHeightInLayout`) reserves space at the bottom of the screen.
        <View style={[styles.flowingContainer, { height: occupiedHeightInLayout }]}>
            {/* SVG Container: Absolutely positioned to sit at the bottom of flowingContainer
                but tall enough to draw the overhang above it. */}
            <View style={[styles.svgWrapper, { height: svgTotalVisualHeight }]}>
                <Svg width={screenWidth} height={svgTotalVisualHeight}>
                    <AnimatedPath fill={TAB_BAR_COLOR} animatedProps={animatedPathProps} />
                </Svg>
            </View>

            {/* Tab Items (inactive icons): Positioned on the flat surface of the bar */}
            <View style={styles.tabItemsArea}>
                {routes.map((route, i) => {
                    const { options } = descriptors[route.key] as { options: BottomTabNavigationOptions };
                    const isFocused = activeIndex === i;
                    const iconInfo = iconMap[route.name];
                    const IconComponent = iconInfo?.component;
                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params as any);
                    };
                    const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
                    return (
                        <Pressable
                            key={route.key} accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel || iconInfo?.label}
                            testID={(options as any).tabBarTestID} onPress={onPress} onLongPress={onLongPress}
                            style={[styles.tabItem, { width: tabWidth }]}
                        >
                            {IconComponent && !isFocused && <IconComponent color={ICON_COLOR_INACTIVE} size={ICON_SIZE} />}
                        </Pressable>
                    );
                })}
            </View>

            {/* Animated Bubble: Absolutely positioned. Its top edge aligns with the visual top of the component. */}
            <Animated.View style={[styles.bubble, animatedBubbleStyle, { top: -BUBBLE_OVERHANG }]}>
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
    flowingContainer: {
        width: screenWidth,
        backgroundColor: 'transparent',
        // height is set dynamically (occupiedHeightInLayout)
    },
    svgWrapper: { // Holds the SVG and its shadow. Positioned to overhang.
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.18,
        shadowRadius: 5,
        elevation: 10, // For Android shadow
    },
    tabItemsArea: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: TAB_BAR_CONTENT_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1, // Ensure pressables are above the SVG visually
    },
    tabItem: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubble: {
        position: 'absolute',
        // `top: -BUBBLE_OVERHANG` is set dynamically in the component.
        // This positions the bubble's top edge at the very top of the visual overhang.
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: BUBBLE_SIZE / 2,
        backgroundColor: TAB_BAR_COLOR,
        borderColor: ACTIVE_BUBBLE_BORDER_COLOR,
        borderWidth: BUBBLE_BORDER_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 12, // Higher than svgWrapper
        zIndex: 2,
    },
});

export default CustomTabBar;