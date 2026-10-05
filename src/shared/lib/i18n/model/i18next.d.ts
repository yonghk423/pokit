import 'i18next';

import type koMessages from './messages/ko.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof koMessages;
    };
  }
}
