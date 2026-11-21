import ExpoModulesCore
import StoreKit

public class DaylightPurchaseProofModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DaylightPurchaseProof")
    AsyncFunction("getSignedTransactions") { () async -> [String] in
      var proofs: [String] = []
      for await result in Transaction.currentEntitlements {
        guard case .verified(let transaction) = result,
              ["monthly", "yearly", "lifetime"].contains(transaction.productID),
              transaction.revocationDate == nil,
              !transaction.isUpgraded else { continue }
        proofs.append(result.jwsRepresentation)
      }
      return proofs
    }
  }
}
