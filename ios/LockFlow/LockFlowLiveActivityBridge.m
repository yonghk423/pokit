#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LockFlowLiveActivity, NSObject)

RCT_EXTERN_METHOD(upsertActivity:(NSString *)payloadJson)

RCT_EXTERN_METHOD(endActivity)

@end
