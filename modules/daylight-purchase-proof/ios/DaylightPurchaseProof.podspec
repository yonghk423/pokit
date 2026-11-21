Pod::Spec.new do |s|
  s.name = 'DaylightPurchaseProof'
  s.version = '1.0.0'
  s.summary = 'Read verified StoreKit purchase proofs'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'Daylight'
  s.homepage = 'https://example.com'
  s.platform = :ios, '15.0'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.swift_version = '5.9'
end
