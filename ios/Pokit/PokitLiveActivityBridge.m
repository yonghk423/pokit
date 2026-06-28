#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PokitLiveActivity, NSObject)

RCT_EXTERN_METHOD(upsertActivity:(NSString *)payloadJson)

RCT_EXTERN_METHOD(endActivity)
RCT_EXTERN_METHOD(endActivityByBlockId:(NSString *)blockId)

RCT_EXTERN_METHOD(upsertAndSuspend:(NSString *)payloadJson)

RCT_EXTERN_METHOD(endAndSuspend)

RCT_EXTERN_METHOD(suspendApp)

@end
