import { Plus } from 'lucide-react-native';
import * as React from 'react';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';

const FAB_HEIGHT = 50;

export type ExpandableTabFabProps = {
  bottom: number;
  fabAnimation: Animated.Value;
  fabExpanded: boolean;
  expandedWidth: number;
  onPress: () => void;
  label?: string;
  /** Changes when light/dark switches — remounts the surface to avoid Android ghost layers */
  surfaceKey: string;
  backgroundColor: string;
  collapsedWidth?: number;
  plusColor?: string;
};

/**
 * Expandable pill/circle FAB: width is animated on an outer shell; background, radius, and
 * elevation live on an inner view so Android does not leave a square shadow after theme changes.
 */
export function ExpandableTabFab({
  bottom,
  fabAnimation,
  fabExpanded,
  expandedWidth,
  onPress,
  label,
  surfaceKey,
  backgroundColor,
  collapsedWidth = FAB_HEIGHT,
  plusColor = '#FFFFFF',
}: ExpandableTabFabProps) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom,
        right: -10,
        height: FAB_HEIGHT,
        width: fabAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [collapsedWidth, expandedWidth],
        }),
        flexDirection: 'row',
        alignItems: 'stretch',
      }}>
      <View
        key={`fab-surface-${surfaceKey}`}
        collapsable={false}
        style={{
          flex: 1,
          borderRadius: FAB_HEIGHT / 2,
          overflow: 'hidden',
          backgroundColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: Platform.OS === 'android' ? 4 : 0,
        }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flex: 1,
            paddingLeft: 12,
            paddingRight: 20,
          }}
          onPress={onPress}
          activeOpacity={0.8}>
          <Plus size={24} color={plusColor} strokeWidth={2} />
          {fabExpanded && label ? (
            <Text
              style={{
                color: plusColor,
                fontSize: 13,
                fontWeight: '600',
                marginLeft: 10,
                textTransform: 'uppercase',
              }}>
              {label}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
