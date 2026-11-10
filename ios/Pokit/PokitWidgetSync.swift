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

  /// Copy the rendered calendar into App Group storage before releasing the JS temporary file.
  @objc func syncCalendarWidgetImage(_ uri: String, month: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    comicImageQueue.async {
      guard let source = self.resolveArtworkSourceURL(uri),
            let image = UIImage(contentsOfFile: source.path),
            let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: PokitAppGroup.identifier),
            let defaults = UserDefaults(suiteName: PokitAppGroup.identifier)
      else { reject("calendar_image_unavailable", "Calendar render unavailable", nil); return }
      // View-shot dimensions can be multiplied by the device display scale.
      // Store a bounded pixel image, not a 1980px snapshot that WidgetKit rejects.
      let scale = min(1, 660 / max(image.size.width, image.size.height))
      let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
      let format = UIGraphicsImageRendererFormat()
      format.scale = 1
      format.opaque = true
      let thumbnail = UIGraphicsImageRenderer(size: size, format: format).image { _ in
        image.draw(in: CGRect(origin: .zero, size: size))
      }
      guard let data = thumbnail.jpegData(compressionQuality: 0.92) else {
        reject("calendar_image_encode", "Calendar render could not be encoded", nil)
        return
      }
      do {
        let filename = "calendar-current.jpg"
        let target = container.appendingPathComponent(filename)
        // Do not spend WidgetKit reload budget on identical foreground captures.
        if (try? Data(contentsOf: target)) == data,
           defaults.string(forKey: "pokit.calendar-widget.month") == month {
          resolve(nil)
          return
        }
        try data.write(to: target, options: .atomic)
        defaults.set(filename, forKey: "pokit.calendar-widget.image")
        defaults.set(month, forKey: "pokit.calendar-widget.month")
        defaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: "PokitComicSceneWidget")
        // Only the current widget handoff image is retained, never a render history.
        defaults.removeObject(forKey: "pokit.calendar-widget.previous")
        if let files = try? FileManager.default.contentsOfDirectory(at: container, includingPropertiesForKeys: nil) {
          for file in files where file.lastPathComponent.hasPrefix("calendar-") && file.pathExtension == "jpg" && file.lastPathComponent != filename {
            try? FileManager.default.removeItem(at: file)
          }
        }
        resolve(nil)
      } catch { reject("calendar_image_write", "Calendar render could not be saved", error) }
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
