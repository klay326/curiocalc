import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        self.window = UIWindow(windowScene: windowScene)
        let vc = CAPBridgeViewController()
        self.window!.rootViewController = vc
        self.window!.makeKeyAndVisible()

        // Cold start from a universal link or custom-scheme URL. With UIScene, iOS hands these to the
        // scene instead of the AppDelegate, so forward them to Capacitor. The web app picks the URL up
        // via App.getLaunchUrl() once it loads.
        for activity in connectionOptions.userActivities {
            forward(activity)
        }
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
    }

    // Universal link tapped while the app is already running
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        forward(userActivity)
    }

    // Custom-scheme URL opened while the app is already running
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    private func forward(_ activity: NSUserActivity) {
        guard activity.activityType == NSUserActivityTypeBrowsingWeb else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
}
