package com.ikizurasenryaku.montasku;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
  private static final String PRODUCTION_BANNER_AD_UNIT_ID = "ca-app-pub-2764076693225531/9746179416";
  private static final String TEST_BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111";
  private static final int BANNER_HEIGHT_DP = 50;

  private View offlineErrorView;
  private AdView bannerAdView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(FirebaseAuthenticationPlugin.class);
    super.onCreate(savedInstanceState);
    installNativeErrorOverlay();
    installAdMobBanner();
  }

  @Override
  public void onDestroy() {
    if (bannerAdView != null) {
      bannerAdView.destroy();
      bannerAdView = null;
    }
    super.onDestroy();
  }

  private void installNativeErrorOverlay() {
    if (bridge == null) {
      return;
    }

    bridge.setWebViewClient(new OfflineAwareWebViewClient(bridge));

    if (!isOnline()) {
      showOfflineError();
    }
  }

  private void installAdMobBanner() {
    if (bridge == null || bridge.getWebView() == null || bannerAdView != null) {
      return;
    }

    new Thread(() -> MobileAds.initialize(this, initializationStatus -> {})).start();

    WebView webView = bridge.getWebView();
    ViewGroup rootView = (ViewGroup) webView.getParent();
    if (rootView == null) {
      return;
    }

    int bannerHeight = dp(BANNER_HEIGHT_DP);
    ViewGroup.LayoutParams webViewLayoutParams = webView.getLayoutParams();
    if (webViewLayoutParams instanceof ViewGroup.MarginLayoutParams) {
      ViewGroup.MarginLayoutParams marginLayoutParams = (ViewGroup.MarginLayoutParams) webViewLayoutParams;
      marginLayoutParams.topMargin = Math.max(marginLayoutParams.topMargin, bannerHeight);
      webView.setLayoutParams(marginLayoutParams);
    } else {
      webView.setPadding(webView.getPaddingLeft(), webView.getPaddingTop() + bannerHeight, webView.getPaddingRight(), webView.getPaddingBottom());
    }

    bannerAdView = new AdView(this);
    bannerAdView.setAdUnitId(isDebuggableBuild() ? TEST_BANNER_AD_UNIT_ID : PRODUCTION_BANNER_AD_UNIT_ID);
    bannerAdView.setAdSize(AdSize.BANNER);
    bannerAdView.setBackgroundColor(Color.WHITE);

    ViewGroup.LayoutParams adLayoutParams = new ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      bannerHeight
    );
    rootView.addView(bannerAdView, adLayoutParams);
    bannerAdView.bringToFront();
    bannerAdView.loadAd(new AdRequest.Builder().build());
  }

  private boolean isDebuggableBuild() {
    return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }

  private boolean isOnline() {
    ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
    if (connectivityManager == null) {
      return true;
    }

    Network activeNetwork = connectivityManager.getActiveNetwork();
    if (activeNetwork == null) {
      return false;
    }

    NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
    return capabilities != null
      && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
      && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
  }

  private void showOfflineError() {
    runOnUiThread(() -> {
      if (offlineErrorView == null) {
        offlineErrorView = createOfflineErrorView();
        addContentView(
          offlineErrorView,
          new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );
      }
      offlineErrorView.setVisibility(View.VISIBLE);
      offlineErrorView.bringToFront();
    });
  }

  private void hideOfflineError() {
    runOnUiThread(() -> {
      if (offlineErrorView != null) {
        offlineErrorView.setVisibility(View.GONE);
      }
    });
  }

  private View createOfflineErrorView() {
    LinearLayout container = new LinearLayout(this);
    container.setOrientation(LinearLayout.VERTICAL);
    container.setGravity(Gravity.CENTER);
    container.setPadding(dp(28), dp(28), dp(28), dp(28));
    container.setBackgroundColor(Color.rgb(255, 248, 235));

    TextView title = new TextView(this);
    title.setText("通信できません");
    title.setTextColor(Color.rgb(75, 52, 35));
    title.setTextSize(22);
    title.setTypeface(Typeface.DEFAULT_BOLD);
    title.setGravity(Gravity.CENTER);
    container.addView(title, new LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    ));

    TextView message = new TextView(this);
    message.setText("インターネット接続を確認してから、もう一度読み込みしてください。");
    message.setTextColor(Color.rgb(93, 73, 54));
    message.setTextSize(15);
    message.setGravity(Gravity.CENTER);
    message.setLineSpacing(dp(3), 1.0f);
    LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    );
    messageParams.setMargins(0, dp(14), 0, dp(22));
    container.addView(message, messageParams);

    Button reloadButton = new Button(this);
    reloadButton.setText("再読み込み");
    reloadButton.setAllCaps(false);
    reloadButton.setTextColor(Color.WHITE);
    reloadButton.setTextSize(16);
    reloadButton.setTypeface(Typeface.DEFAULT_BOLD);
    reloadButton.setBackgroundColor(Color.rgb(62, 128, 95));
    reloadButton.setPadding(dp(28), dp(10), dp(28), dp(10));
    reloadButton.setOnClickListener(view -> {
      if (isOnline()) {
        hideOfflineError();
      }
      if (bridge != null) {
        bridge.reload();
      }
    });
    container.addView(reloadButton, new LinearLayout.LayoutParams(
      ViewGroup.LayoutParams.WRAP_CONTENT,
      ViewGroup.LayoutParams.WRAP_CONTENT
    ));

    return container;
  }

  private int dp(int value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }

  private class OfflineAwareWebViewClient extends BridgeWebViewClient {
    OfflineAwareWebViewClient(Bridge bridge) {
      super(bridge);
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      super.onPageFinished(view, url);
      hideOfflineError();
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
      super.onReceivedError(view, request, error);
      if (request.isForMainFrame()) {
        showOfflineError();
      }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
      super.onReceivedHttpError(view, request, errorResponse);
      if (request.isForMainFrame()) {
        showOfflineError();
      }
    }
  }
}
