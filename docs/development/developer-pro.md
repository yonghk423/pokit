# 개발자 Pro 우회 경로 제거

개발자 ID 허용 목록을 통한 무료 Pro 지급 경로는 제거했습니다. 개발 환경도 RevenueCat의 스토어 Sandbox 구매·복원으로 검증합니다. 운영 developer-pro 함수도 2026-11-21 삭제했습니다. 기존 RevenueCat 고객에게 이미 지급된 권한 자체를 회수한 것은 아니며, 앱은 기존 Supabase 기반 고객 ID를 더 이상 사용하지 않습니다.

운영 서버의 DAYLIGHT_DEVELOPER_PRO_USER_IDS 및 REVENUECAT_DEVELOPER_GRANT_KEY secret도 제거했습니다. 일반 구매에 사용하는 RevenueCat 앱 설정과 Apple 키는 유지합니다.
