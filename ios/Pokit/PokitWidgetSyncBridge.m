#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PokitWidgetSync, NSObject)

RCT_EXTERN_METHOD(syncAppFontId:(NSString *)fontId)
RCT_EXTERN_METHOD(syncDayPlanJson:(NSString *)json)
RCT_EXTERN_METHOD(syncPinnedRoutineJson:(NSString *)json)
RCT_EXTERN_METHOD(syncBookstoreWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(syncNoteWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(syncComicSceneWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(syncCalendarWidgetImageForFamily:(NSString *)uri month:(NSString *)month family:(NSString *)family resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(syncCalendarWidgetImage:(NSString *)uri month:(NSString *)month resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(syncWeatherWidgetJson:(NSString *)json)
RCT_EXTERN_METHOD(consumePendingPlanMode:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

#import <SDWebImage/SDImageCache.h>

@interface PokitBookCoverCache : NSObject <RCTBridgeModule>
@end

@implementation PokitBookCoverCache
RCT_EXPORT_MODULE()
+ (BOOL)requiresMainQueueSetup { return NO; }

RCT_EXPORT_METHOD(removeCover:(NSString *)key)
{
  NSURL *url = [NSURL URLWithString:key];
  if (!url || !([url.scheme isEqualToString:@"https"] || [url.scheme isEqualToString:@"http"])) return;
  [[NSURLCache sharedURLCache] removeCachedResponseForRequest:[NSURLRequest requestWithURL:url]];
  [[SDImageCache sharedImageCache] removeImageForKey:key withCompletion:nil];
}
@end
