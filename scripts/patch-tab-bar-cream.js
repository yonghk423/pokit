/**
 * iOS 26 탭 바는 아이템 appearance만으로는 유리 캡슐이 흰 채로 남는다.
 * 배경색이 있으면 불투명으로 만들고, 그 appearance를 UITabBar에 복사한다.
 * react-native-screens가 탭 바 배경을 직접 칠하면 이 스크립트는 제거해도 된다.
 */

const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-screens',
  'ios',
  'tabs',
  'RNSTabBarAppearanceCoordinator.mm',
);

const marker = 'pokit: iOS 26 liquid-glass capsule';

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');
if (source.includes(marker)) {
  process.exit(0);
}

const itemLoop = `    [self configureTabBarItemForTabScreenController:tabScreenCtrl imageLoader:imageLoader];
  }
}`;

const itemLoopPatched = `    [self configureTabBarItemForTabScreenController:tabScreenCtrl imageLoader:imageLoader];
  }

  // ${marker} ignores item appearances.
  // Copy the screen appearance onto the tab bar so the pill uses the same fill.
  for (RNSTabsScreenViewController *tabScreenCtrl in tabScreenCtrls) {
    UITabBarAppearance *standard = tabScreenCtrl.tabScreenComponentView.standardAppearance;
    if (standard == nil) {
      continue;
    }
    UITabBarAppearance *scrollEdge = tabScreenCtrl.tabScreenComponentView.scrollEdgeAppearance;
    tabBar.standardAppearance = standard;
    tabBar.scrollEdgeAppearance = scrollEdge != nil ? scrollEdge : standard;
    break;
  }
}`;

const colorAssign = `  if (appearanceProps[@"tabBarBackgroundColor"] != nil) {
    tabBarAppearance.backgroundColor = [RCTConvert UIColor:appearanceProps[@"tabBarBackgroundColor"]];
  }`;

const colorAssignPatched = `  if (appearanceProps[@"tabBarBackgroundColor"] != nil) {
    // pokit: opaque fill. Default appearance stays liquid glass and reads as a white pill.
    [tabBarAppearance configureWithOpaqueBackground];
    tabBarAppearance.backgroundColor = [RCTConvert UIColor:appearanceProps[@"tabBarBackgroundColor"]];
  }`;

if (!source.includes(itemLoop) || !source.includes(colorAssign)) {
  console.warn('[pokit] tab bar cream patch skipped: react-native-screens source changed');
  process.exit(0);
}

const next = source.replace(itemLoop, itemLoopPatched).replace(colorAssign, colorAssignPatched);
fs.writeFileSync(target, next);
