import Capacitor
import CapacitorFirebaseAuthentication
import GoogleMobileAds
import Network
import UIKit

class AppBridgeViewController: CAPBridgeViewController {
    private let productionBannerAdUnitID = "ca-app-pub-2764076693225531/5537447454"
    private let testBannerAdUnitID = "ca-app-pub-3940256099942544/2435281174"
    private var bannerView: BannerView?
    private var bannerTopConstraint: NSLayoutConstraint?
    private let pathMonitor = NWPathMonitor()
    private let pathMonitorQueue = DispatchQueue(label: "com.ikizurasenryaku.montasku.network")
    private var offlineErrorView: UIView?
    private var hasStartedPathMonitor = false

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FirebaseAuthenticationPlugin())
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        installAdMobBanner()
        startPathMonitorIfNeeded()
    }

    deinit {
        pathMonitor.cancel()
    }

    private func startPathMonitorIfNeeded() {
        guard !hasStartedPathMonitor else {
            return
        }

        hasStartedPathMonitor = true
        pathMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                if path.status != .satisfied {
                    self?.showOfflineError()
                }
            }
        }
        pathMonitor.start(queue: pathMonitorQueue)
    }

    private func installAdMobBanner() {
        guard let webView = webView, bannerView == nil else {
            return
        }

        let rootView = UIView(frame: view.bounds)
        rootView.backgroundColor = .white
        rootView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        webView.removeFromSuperview()
        webView.translatesAutoresizingMaskIntoConstraints = false
        view = rootView

        let banner = BannerView(adSize: AdSizeBanner)
        banner.translatesAutoresizingMaskIntoConstraints = false
        banner.adUnitID = adMobBannerAdUnitID()
        banner.rootViewController = self
        banner.backgroundColor = .white
        rootView.addSubview(banner)
        rootView.addSubview(webView)

        NSLayoutConstraint.activate([
            banner.topAnchor.constraint(equalTo: rootView.safeAreaLayoutGuide.topAnchor),
            banner.centerXAnchor.constraint(equalTo: rootView.centerXAnchor),
            webView.topAnchor.constraint(equalTo: banner.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: rootView.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: rootView.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: rootView.bottomAnchor)
        ])

        banner.load(Request())
        bannerView = banner
    }

    private func adMobBannerAdUnitID() -> String {
        #if DEBUG
        return testBannerAdUnitID
        #else
        return productionBannerAdUnitID
        #endif
    }

    private func showOfflineError() {
        if offlineErrorView == nil {
            offlineErrorView = makeOfflineErrorView()
            if let offlineErrorView = offlineErrorView {
                view.addSubview(offlineErrorView)
                NSLayoutConstraint.activate([
                    offlineErrorView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                    offlineErrorView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                    offlineErrorView.topAnchor.constraint(equalTo: view.topAnchor),
                    offlineErrorView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
                ])
            }
        }

        offlineErrorView?.isHidden = false
        if let offlineErrorView = offlineErrorView {
            view.bringSubviewToFront(offlineErrorView)
        }
    }

    private func hideOfflineError() {
        offlineErrorView?.isHidden = true
    }

    private func makeOfflineErrorView() -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = UIColor(red: 1.0, green: 0.973, blue: 0.922, alpha: 1.0)

        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 14
        container.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -28),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor)
        ])

        let titleLabel = UILabel()
        titleLabel.text = "通信できません"
        titleLabel.textColor = UIColor(red: 0.294, green: 0.204, blue: 0.137, alpha: 1.0)
        titleLabel.font = .boldSystemFont(ofSize: 22)
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 0
        stack.addArrangedSubview(titleLabel)

        let messageLabel = UILabel()
        messageLabel.text = "インターネット接続を確認してから、もう一度読み込みしてください。"
        messageLabel.textColor = UIColor(red: 0.365, green: 0.286, blue: 0.212, alpha: 1.0)
        messageLabel.font = .systemFont(ofSize: 15)
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        stack.addArrangedSubview(messageLabel)

        let reloadButton = UIButton(type: .system)
        reloadButton.setTitle("再読み込み", for: .normal)
        reloadButton.setTitleColor(.white, for: .normal)
        reloadButton.titleLabel?.font = .boldSystemFont(ofSize: 16)
        reloadButton.backgroundColor = UIColor(red: 0.243, green: 0.502, blue: 0.373, alpha: 1.0)
        reloadButton.layer.cornerRadius = 10
        reloadButton.contentEdgeInsets = UIEdgeInsets(top: 10, left: 28, bottom: 10, right: 28)
        reloadButton.addTarget(self, action: #selector(reloadFromOfflineError), for: .touchUpInside)
        stack.addArrangedSubview(reloadButton)

        return container
    }

    @objc private func reloadFromOfflineError() {
        hideOfflineError()
        loadWebView()
    }
}
