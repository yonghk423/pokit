#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PokitWidgetSync, NSObject)

RCT_EXTERN_METHOD(syncDayPlanJson:(NSString *)json)
RCT_EXTERN_METHOD(syncPinnedRoutineJson:(NSString *)json)
RCT_EXTERN_METHOD(syncBookstoreWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(syncNoteWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(consumePendingPlanMode:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
