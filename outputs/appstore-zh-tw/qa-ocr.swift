import Foundation
import Vision
import ImageIO

for name in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: name)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hant", "ko-KR", "en-US"]
    request.usesLanguageCorrection = false
    request.usesCPUOnly = true
    do {
        try VNImageRequestHandler(cgImage: image).perform([request])
        let lines: [[String: Any]] = (request.results ?? []).compactMap { item in
            guard let text = item.topCandidates(1).first else { return nil }
            return ["text": text.string, "confidence": text.confidence,
                    "x": item.boundingBox.minX, "y": item.boundingBox.minY,
                    "width": item.boundingBox.width, "height": item.boundingBox.height]
        }
        let data = try JSONSerialization.data(withJSONObject: ["file": name, "lines": lines], options: [.sortedKeys])
        print(String(data: data, encoding: .utf8)!)
    } catch {
        let data = try! JSONSerialization.data(withJSONObject: ["file": name, "error": String(describing: error)])
        print(String(data: data, encoding: .utf8)!)
    }
}
