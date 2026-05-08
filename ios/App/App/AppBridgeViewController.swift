import Capacitor
import CapacitorFirebaseAuthentication

class AppBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FirebaseAuthenticationPlugin())
    }
}
