package com.charpet.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat

class OverlayService : Service() {
    companion object {
        const val ACTION_EVENT = "com.charpet.app.ACTION_EVENT"
        const val EXTRA_EVENT_JSON = "com.charpet.app.EXTRA_EVENT_JSON"
        private const val CHANNEL_ID = "charpet_overlay"
        private const val NOTIFICATION_ID = 1001
    }

    private lateinit var windowManager: WindowManager
    private var overlay: FrameLayout? = null
    private var webView: WebView? = null
    private var params: WindowManager.LayoutParams? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("CharPet 正在陪着你")
            .setContentText("桌宠悬浮窗运行中")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (Settings.canDrawOverlays(this)) showOverlay()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!Settings.canDrawOverlays(this)) return START_NOT_STICKY
        if (overlay == null) showOverlay()
        intent?.getStringExtra(EXTRA_EVENT_JSON)?.let { sendEventToWeb(it) }
        return START_STICKY
    }

    private fun showOverlay() {
        if (overlay != null) return
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val density = resources.displayMetrics.density
        val size = (220 * density).toInt()
        val root = FrameLayout(this)
        val view = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.TRANSPARENT)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            webViewClient = WebViewClient()
            addJavascriptInterface(CharPetBridge(), "CharPetNative")
            loadDataWithBaseURL("https://charpet.local/", html(), "text/html", "UTF-8", null)
        }
        root.addView(view, FrameLayout.LayoutParams(-1, -1))
        installDrag(root)

        val lp = WindowManager.LayoutParams(
            size,
            size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (24 * density).toInt()
            y = (160 * density).toInt()
        }
        windowManager.addView(root, lp)
        overlay = root
        webView = view
        params = lp
    }

    private fun installDrag(root: View) {
        val touchSlop = 12
        var downX = 0f
        var downY = 0f
        var startX = 0
        var startY = 0
        var dragging = false
        root.setOnTouchListener { _, event ->
            val lp = params ?: return@setOnTouchListener false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX
                    downY = event.rawY
                    startX = lp.x
                    startY = lp.y
                    dragging = false
                    false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downX
                    val dy = event.rawY - downY
                    if (!dragging && (kotlin.math.abs(dx) > touchSlop || kotlin.math.abs(dy) > touchSlop)) dragging = true
                    if (dragging) {
                        lp.x = startX + dx.toInt()
                        lp.y = startY + dy.toInt()
                        windowManager.updateViewLayout(root, lp)
                    }
                    dragging
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> dragging
                else -> false
            }
        }
    }

    private fun sendEventToWeb(json: String) {
        webView?.post {
            val safe = json.replace("\\", "\\\\").replace("'", "\\'")
            webView?.evaluateJavascript("window.dispatchEvent(new CustomEvent('charpet:native-event',{detail:JSON.parse('$safe')}));", null)
        }
    }

    private fun html() = """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}
          body{display:grid;place-items:center;font-family:system-ui}
          #pet{width:150px;height:150px;border-radius:44% 56% 52% 48%;background:#fff8ef;border:2px solid #2b2927;box-shadow:0 12px 30px #0002;display:grid;place-items:center;font-size:64px;transition:.2s;user-select:none}
          #bubble{position:absolute;top:5px;max-width:190px;background:#fffdf9;border:1px solid #ddd7ce;border-radius:999px;padding:5px 10px;font-size:12px;opacity:0;transition:.2s}
          #bubble.show{opacity:1}
          .happy{animation:bounce .5s ease-in-out}.sleep{animation:float 2s ease-in-out infinite;opacity:.72}
          @keyframes bounce{50%{transform:scale(1.12) rotate(-3deg)}}
          @keyframes float{50%{transform:translateY(6px) scale(.97)}}
        </style></head><body><div id="bubble"></div><div id="pet">🐾</div>
        <script>
          const pet=document.getElementById('pet'),bubble=document.getElementById('bubble');
          function render(e){
            pet.className=e.emotion||''; bubble.textContent=e.text||''; bubble.classList.toggle('show',!!e.text);
            if(e.action==='talk'||e.action==='tap'||e.action==='wake') { pet.classList.remove('happy'); void pet.offsetWidth; pet.classList.add('happy'); }
            if(e.emotion==='sleep'||e.action==='sleep') pet.classList.add('sleep'); else pet.classList.remove('sleep');
          }
          window.addEventListener('charpet:native-event',e=>render(e.detail));
          pet.addEventListener('click',()=>window.CharPetNative?.postEvent(JSON.stringify({type:'charpet.event',action:'tap',emotion:'happy',intensity:.9,text:'被你摸到啦'})));
        </script></body></html>
    """.trimIndent()

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "CharPet 桌宠", NotificationManager.IMPORTANCE_LOW))
    }

    override fun onDestroy() {
        overlay?.let { windowManager.removeView(it) }
        webView?.destroy()
        overlay = null
        webView = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    inner class CharPetBridge {
        @JavascriptInterface
        fun postEvent(json: String) {
            sendEventToWeb(json)
        }
    }
}
