import Foundation
import React
import WidgetKit
import UIKit
import ImageIO
import CryptoKit

@objc(PokitWidgetSync)
class PokitWidgetSync: NSObject {
  private let comicImageQueue = DispatchQueue(label: "app.pokit.widget-images")

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc func syncAppFontId(_ fontId: String) {
    guard ["corncorn", "hiMelody", "cafe24ShiningStar", "cafe24Syongsyong"].contains(fontId),
          let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    guard ud.string(forKey: PokitAppGroup.appFontIdKey) != fontId else { return }
    ud.set(fontId, forKey: PokitAppGroup.appFontIdKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitComicSceneWidget")
  }

  @objc func syncDayPlanJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.dayPlanJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitDayPlanWidget")
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitDayPlanHomeWidget")
  }

  @objc func syncPinnedRoutineJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.pinnedRoutineJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitPinnedRoutineWidget")
  }

  @objc func syncBookstoreWidgetJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.bookstoreWidgetJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitBookstoreWidget")
  }

  @objc func syncNoteWidgetJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.noteWidgetJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitNoteWidget")
  }

  @objc func syncComicSceneWidgetJson(_ json: String) {
    comicImageQueue.async {
      guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier),
            let data = json.data(using: .utf8),
            var bundle = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else { return }
      var keepFiles = Set<String>()
      if let rows = bundle["scenes"] as? [[String: Any]] {
        bundle["scenes"] = rows.map { row in
          var next = row
          if let uri = row["artworkUri"] as? String,
             let file = self.sharedComicArtwork(uri) {
            next["artworkFile"] = file
            keepFiles.insert(file)
          }
          next.removeValue(forKey: "artworkUri")
          return next
        }
      }
      self.pruneComicArtwork(keeping: keepFiles)
      guard let output = try? JSONSerialization.data(withJSONObject: bundle),
            let stored = String(data: output, encoding: .utf8) else { return }
      ud.set(stored, forKey: PokitAppGroup.comicSceneWidgetJsonKey)
      ud.synchronize()
      WidgetCenter.shared.reloadTimelines(ofKind: "PokitComicSceneWidget")
    }
  }

  private func comicArtworkDirectory() -> URL? {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: PokitAppGroup.identifier)
    else { return nil }
    return container.appendingPathComponent("ComicArtwork", isDirectory: true)
  }

  private func resolveArtworkSourceURL(_ uri: String) -> URL? {
    if let url = URL(string: uri), url.isFileURL {
      return url
    }
    if uri.hasPrefix("/") {
      let url = URL(fileURLWithPath: uri)
      if FileManager.default.fileExists(atPath: url.path) { return url }
    }
    let relative = uri.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    if let bundled = Bundle.main.resourceURL?.appendingPathComponent(relative),
       FileManager.default.fileExists(atPath: bundled.path) {
      return bundled
    }
    return nil
  }

  /// Widgets cannot read the app's private Documents directory. Keep a small JPEG in the shared container.
  private func sharedComicArtwork(_ uri: String) -> String? {
    guard let source = resolveArtworkSourceURL(uri),
          let directory = comicArtworkDirectory()
    else { return nil }
    let hash = SHA256.hash(data: Data(uri.utf8)).map { String(format: "%02x", $0) }.joined()
    let name = "\(hash).jpg"
    let target = directory.appendingPathComponent(name)
    if FileManager.default.fileExists(atPath: target.path) { return name }
    guard let imageSource = CGImageSourceCreateWithURL(source as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 720,
            kCGImageSourceShouldCacheImmediately: true
          ] as CFDictionary),
          let jpeg = UIImage(cgImage: image).jpegData(compressionQuality: 0.78)
    else { return nil }
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try jpeg.write(to: target, options: .atomic)
      return name
    } catch { return nil }
  }

  private func pruneComicArtwork(keeping keepFiles: Set<String>) {
    guard let directory = comicArtworkDirectory() else { return }
    guard let files = try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) else { return }
    for file in files {
      guard file.pathExtension.lowercased() == "jpg" else { continue }
      if keepFiles.contains(file.lastPathComponent) { continue }
      try? FileManager.default.removeItem(at: file)
    }
  }

  @objc func syncWeatherWidgetJson(_ json: String) {
    guard let ud = UserDefaults(suiteName: PokitAppGroup.identifier) else { return }
    ud.set(json, forKey: PokitAppGroup.weatherWidgetJsonKey)
    ud.synchronize()
    WidgetCenter.shared.reloadTimelines(ofKind: "PokitComicSceneWidget")
  }

  /// 위젯 탭으로 남겨 둔 planMode를 한 번 읽고 지운다.
  @objc func consumePendingPlanMode(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    if let mode = PokitAppGroup.consumePendingPlanMode() {
      resolve(mode)
    } else {
      resolve(NSNull())
    }
  }
}
