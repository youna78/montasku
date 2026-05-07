import Capacitor

class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()

        if bridge?.plugin(withName: "FirebaseAuthentication") != nil {
            print("[AppBridge] FirebaseAuthenticationPlugin already registered")
            return
        }

        registerCapacitorPluginIfNeeded(classNames: [
            "CapacitorFirebaseAuthentication.FirebaseAuthenticationPlugin",
            "FirebaseAuthenticationPlugin"
        ])
    }

    private func registerCapacitorPluginIfNeeded(classNames: [String]) {
        for className in classNames {
            if let pluginClass = NSClassFromString(className) as? CAPPlugin.Type {
                print("[AppBridge] Registering plugin: \(className)")
                let plugin = pluginClass.init()
                bridge?.registerPluginInstance(plugin)
                return
            }
        }

        print("[AppBridge] FirebaseAuthenticationPlugin was not found.")
    }
}
