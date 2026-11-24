package com.belal.impostor;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.content.Intent;
import android.net.Uri;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
public class MainActivity extends Activity {
  WebView w;
  ValueCallback<Uri[]> fcb;
  PermissionRequest pend;
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    w = new WebView(this);
    w.setBackgroundColor(Color.parseColor("#0b0d14"));
    WebSettings s = w.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
    s.setAllowFileAccess(false); s.setSupportZoom(false); s.setMediaPlaybackRequiresUserGesture(false);
    w.setWebViewClient(new WebViewClient());
    w.setWebChromeClient(new WebChromeClient() {
      @Override public void onPermissionRequest(final PermissionRequest r) {
        runOnUiThread(() -> {
          if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) r.grant(r.getResources());
          else { pend = r; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 78); }
        });
      }
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (fcb != null) fcb.onReceiveValue(null);
        fcb = cb;
        try {
          Intent i = new Intent(Intent.ACTION_GET_CONTENT);
          i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("image/*");
          startActivityForResult(Intent.createChooser(i, "اختار صورة"), 77);
        } catch (Exception e) { fcb = null; cb.onReceiveValue(null); return false; }
        return true;
      }
    });
    setContentView(w);
    w.loadUrl("file:///android_asset/www/index.html");
  }
  @Override protected void onActivityResult(int rq, int rs, Intent d) {
    if (rq == 77 && fcb != null) {
      Uri[] r = null;
      if (rs == RESULT_OK && d != null && d.getData() != null) r = new Uri[]{d.getData()};
      fcb.onReceiveValue(r); fcb = null;
    } else super.onActivityResult(rq, rs, d);
  }
  @Override public void onRequestPermissionsResult(int rq, String[] p, int[] g) {
    if (rq == 78 && pend != null) {
      if (g.length > 0 && g[0] == PackageManager.PERMISSION_GRANTED) pend.grant(pend.getResources()); else pend.deny();
      pend = null;
    } else super.onRequestPermissionsResult(rq, p, g);
  }
  @Override public void onBackPressed() {
    w.evaluateJavascript("window.__back&&window.__back()", v -> { if (!"true".equals(v)) finish(); });
  }
}
