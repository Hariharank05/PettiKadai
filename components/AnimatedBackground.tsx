import React, { useEffect, useRef } from 'react';
import { View, Dimensions, Animated } from 'react-native';
import { ShoppingBag, Carrot, Apple, Milk, Package, Coffee, ShoppingCart, Banana, Egg, Wheat } from 'lucide-react-native';

// Color palette for icons
const iconColors = [
  '#FBBF24', // Yellow
//   '#EF4444', // Red
//   '#10B981', // Green
//   '#3B82F6', // Blue
//   '#F97316', // Orange
];

// Animated icon component
const AnimatedIcon = ({ IconComponent, size, x, y, delay, color }: {
  IconComponent: any,
  size: number,
  x: number,
  y: number,
  delay: number,
  color: string
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -20,
            duration: 2000 + Math.random() * 1000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 1500 + Math.random() * 500,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1500 + Math.random() * 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animate();
  }, [translateY, scale, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: 0.2,
        transform: [{ translateY }, { scale }],
      }}
    >
      <IconComponent size={size} color={color} />
    </Animated.View>
  );
};

// Kirana shop-related icons with random positions and colors
const kiranaIcons = [
  { Icon: ShoppingBag, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 0, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Carrot, size: 25, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 300, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Apple, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 600, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Milk, size: 32, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 900, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Package, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 1500, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Coffee, size: 26, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 1800, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: ShoppingCart, size: 29, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2100, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Banana, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2400, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Egg, size: 27, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2700, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Wheat, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 3000, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: ShoppingBag, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 0, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Carrot, size: 25, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 300, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Apple, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 600, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: ShoppingCart, size: 29, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2100, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Banana, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2400, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Egg, size: 27, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2700, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Wheat, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 3000, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: ShoppingBag, size: 30, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 0, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Carrot, size: 25, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 300, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Apple, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 600, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
  { Icon: Banana, size: 28, x: Math.random() * (Dimensions.get('window').width - 60) + 30, y: Math.random() * (Dimensions.get('window').height - 60) + 30, delay: 2400, color: iconColors[Math.floor(Math.random() * iconColors.length)] },
];

const AnimatedBackground = () => {
  const { width, height } = Dimensions.get('window');

  return (
    <View style={{ position: 'absolute', width, height, zIndex: 0 }}>
      {kiranaIcons.map((icon, index) => (
        <AnimatedIcon
          key={index}
          IconComponent={icon.Icon}
          size={icon.size}
          x={icon.x}
          y={icon.y}
          delay={icon.delay}
          color={icon.color}
        />
      ))}
    </View>
  );
};

export default AnimatedBackground;