import React from 'react';

import { Tabs } from 'expo-router';

import { DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  resolveAppFontFamily,
  useAppFontSizeId,
  useEffectiveAppFontId,
} from '@shared/lib/ui-font';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';
import { IconSymbol } from '@shared/ui/icon-symbol';

const TAB_ICONS: Record<string, string> = {
  'day-plan': 'calendar',
  'fixed-routines': 'list.bullet.rectangle',
  /** 퍼즐 History — 기억/사진 스택 느낌 */
  'puzzle-history': 'rectangle.stack',
  /** 주간·월간 통계 History */
  'day-plan-statistics': 'clock.arrow.circlepath',
  'pokit-story': 'book',
};

/** 탭 라벨 고정 크기 — 글씨 크기 설정(sm/md/lg)과 무관 */
const TAB_LABEL_FONT_SIZE = 10;

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const { t } = useTranslation();
  const appFontId = useEffectiveAppFontId();
  const appFontSizeId = useAppFontSizeId();
  const tabLabelFontFamily = resolveAppFontFamily(appFontId, '600');

  return (
    <DayPlanTabBridgeProvider>
      <Tabs
        key={`${appFontId}-${appFontSizeId}`}
        initialRouteName="day-plan"
        detachInactiveScreens
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
          tabBarInactiveTintColor: isDark ? '#8E8E93' : '#999999',
          tabBarLabelStyle: {
            fontSize: TAB_LABEL_FONT_SIZE,
            ...(tabLabelFontFamily ? { fontFamily: tabLabelFontFamily } : null),
          },
          tabBarIcon: ({ color }) => {
            const icon = TAB_ICONS[route.name] ?? 'circle';
            return <IconSymbol name={icon as any} size={24} color={color} />;
          },
        })}>
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="day-plan" options={{ title: t('tabs.dayPlan') }} />
        <Tabs.Screen name="fixed-routines" options={{ title: t('tabs.routines') }} />
        {/**
         * 나만의 루틴 — 하단 탭에서 제거하고 루틴 탭 서브탭으로 통합.
         * 레거시 딥링크는 priority-catalog.tsx에서 리다이렉트.
         */}
        <Tabs.Screen
          name="priority-catalog"
          options={{ href: null, title: t('tabs.myRoutines') }}
        />
        <Tabs.Screen name="puzzle-history" options={{ title: t('tabs.puzzle') }} />
        {/**
         * 주간·월간 히스토리 — 하단 탭에서 제거하고 루틴 탭 상단 포스트잇으로 진입.
         * 라우트는 유지해 deep link / router.push 가능.
         */}
        <Tabs.Screen
          name="day-plan-statistics"
          options={{ href: null, title: t('tabs.history') }}
        />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
      </Tabs>
    </DayPlanTabBridgeProvider>
  );
}
