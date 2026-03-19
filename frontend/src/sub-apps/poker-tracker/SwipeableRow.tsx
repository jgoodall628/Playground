import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, PanResponder, LayoutAnimation,
} from 'react-native';

export interface SwipeAction {
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  actions: SwipeAction[];
  children: React.ReactNode;
}

const ACTION_WIDTH = 72;

export default function SwipeableRow({ actions, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openWidth = actions.length * ACTION_WIDTH;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) {
          translateX.setValue(Math.max(g.dx, -openWidth));
        } else {
          translateX.setValue(Math.min(g.dx, 0));
        }
      },
      onPanResponderRelease: (_, g) => {
        const shouldOpen = g.dx < -openWidth / 3 || g.vx < -0.5;
        Animated.spring(translateX, {
          toValue: shouldOpen ? -openWidth : 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }).start();
      },
    }),
  ).current;

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.actionsContainer, { width: openWidth }]}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.actionBtn, { backgroundColor: action.color, width: ACTION_WIDTH }]}
            onPress={() => {
              close();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              action.onPress();
            }}
          >
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Animated.View
        style={[styles.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 8,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    backgroundColor: '#fff',
  },
});
