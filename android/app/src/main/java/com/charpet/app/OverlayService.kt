package com.charpet.app

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
import android.webkit.WebMessage
import android.webkit.WebMessagePort
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
        private const val ORIGIN = "https://charpet.local"
    }

    private lateinit var windowManager: WindowManager
    private var overlay: FrameLayout? = null
    private var webView: WebView? = null
    private var params: WindowManager.LayoutParams? = null
    private var webPort: WebMessagePort? = null

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
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else startForeground(NOTIFICATION_ID, notification)
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
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    if (view != null && webPort == null) setupMessageChannel(view)
                }
            }
        }
        root.addView(view, FrameLayout.LayoutParams(-1, -1))
        installDrag(root)
        val lp = WindowManager.LayoutParams(
            size, size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
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
        view.loadDataWithBaseURL(ORIGIN + "/", html(), "text/html", "UTF-8", null)
    }

    private fun installDrag(root: View) {
        val touchSlop = 12
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0; var dragging = false
        root.setOnTouchListener { _, event ->
            val lp = params ?: return@setOnTouchListener false
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = event.rawX; downY = event.rawY; startX = lp.x; startY = lp.y; dragging = false; false }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - downX; val dy = event.rawY - downY
                    if (!dragging && (kotlin.math.abs(dx) > touchSlop || kotlin.math.abs(dy) > touchSlop)) dragging = true
                    if (dragging) { lp.x = startX + dx.toInt(); lp.y = startY + dy.toInt(); windowManager.updateViewLayout(root, lp) }
                    dragging
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> dragging
                else -> false
            }
        }
    }

    private fun sendEventToWeb(json: String) {
        webView?.post {
            webPort?.postMessage(WebMessage(json)) ?: run {
                val safe = org.json.JSONObject.quote(json)
                webView?.evaluateJavascript("window.__charpetReceive && window.__charpetReceive(JSON.parse($safe))", null)
            }
        }
    }

    private fun setupMessageChannel(view: WebView) {
        val channel = view.createWebMessageChannel()
        webPort = channel[0]
        webPort?.setWebMessageCallback(object : WebMessagePort.WebMessageCallback() {
            override fun onMessage(port: WebMessagePort, message: WebMessage) {
                val payload = message.data ?: return
                if (payload.contains("\"type\":\"charpet.event\"")) sendEventToWeb(payload)
            }
        })
        view.postWebMessage(WebMessage(null, arrayOf(channel[1])), android.net.Uri.parse(ORIGIN))
    }

    private fun html(): String {
        val pet = CharPetStore(this).load()
        val name = org.json.JSONObject.quote(pet?.optString("name", "我的 Char") ?: "我的 Char")
        val inlineSvg = pet?.let { CharPetRenderer.inlineSvgFor(it) }
        val customImage = pet?.let { CharPetRenderer.imageFor(it) }
        val visual = if (inlineSvg != null) inlineSvg else {
            val src = org.json.JSONObject.quote(customImage ?: "")
            "<img id='petImage' alt='CharPet' src=$src>"
        }
        return """
        <!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>
        <style>
          html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}
          body{display:grid;place-items:center;font-family:system-ui}
          #pet{width:168px;height:210px;display:grid;place-items:center;filter:drop-shadow(0 12px 18px #0002);user-select:none;transition:transform .18s}
          #pet svg,#petImage{width:100%;height:100%;object-fit:contain}
          #bubble{position:absolute;top:4px;max-width:190px;background:#fffdf9;border:1px solid #ddd7ce;border-radius:999px;padding:5px 10px;font-size:12px;opacity:0;transition:.2s;z-index:2}
          #bubble.show{opacity:1}
          #pet.action-talk .pet-talk{animation:none}
          #pet.action-talk .pet-mouth{animation:petTalk .28s ease-in-out infinite alternate}
          #pet.action-talk .pet-eyes{animation:none}
          #pet.action-talk .pet-eyes{transform:scaleY(.88);transform-origin:center}
          #pet.emotion-happy .pet-body{animation:petHappy .7s ease-in-out 2}
          #pet.emotion-angry .pet-body{animation:petAngry .25s ease-in-out 3}
          #pet.emotion-surprised .pet-body{animation:petPop .55s ease-out}
          #pet.emotion-shy .pet-body{animation:petShy .8s ease-in-out}
          #pet.emotion-sleep .pet-eyes{transform:scaleY(.18);transform-origin:center}
          @keyframes petTalk{from{transform:scaleY(.55)}to{transform:scaleY(1.18)}}
          @keyframes petHappy{50%{transform:translateY(-7px) scale(1.08) rotate(-3deg)}}
          @keyframes petAngry{50%{transform:translateX(5px)}}
          @keyframes petPop{50%{transform:scale(1.12)}}
          @keyframes petShy{50%{transform:scale(.94) rotate(2deg)}}
          .legacy{animation:bounce .5s ease-in-out}.legacy.sleep{animation:float 2s ease-in-out infinite;opacity:.72}
          @keyframes bounce{50%{transform:scale(1.1) rotate(-3deg)}} @keyframes float{50%{transform:translateY(7px) scale(.97)}}
        </style></head><body><div id='bubble'></div><div id='pet'>$visual</div>
        <script>
          const pet=document.getElementById('pet'),bubble=document.getElementById('bubble');
          function render(e){
            e=e||{}; pet.className='';
            if(e.action) pet.classList.add('action-'+e.action);
            if(e.emotion) pet.classList.add('emotion-'+e.emotion);
            bubble.textContent=e.text||''; bubble.classList.toggle('show',!!e.text);
            if(e.action==='talk'||e.action==='tap'||e.action==='wake'){
              pet.classList.add('legacy'); setTimeout(()=>pet.classList.remove('legacy'),700);
            }
            if(e.emotion==='sleep'||e.action==='sleep') pet.classList.add('emotion-sleep');
          }
          window.__charpetReceive=render;
          window.addEventListener('message',e=>{if(e.data?.type==='charpet.event')render(e.data);if(e.ports?.[0]){const port=e.ports[0];port.onmessage=m=>{try{render(JSON.parse(m.data));}catch(_){}};port.start();port.postMessage(JSON.stringify({type:'charpet.ready'}));}});
          pet.addEventListener('click',()=>render({type:'charpet.event',action:'tap',emotion:'happy',intensity:.9,text:'被你摸到啦'}));
          render({action:'idle',emotion:'idle',intensity:.35});
        </script></body></html>
        """
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < 26) return
        getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "CharPet 桌宠", NotificationManager.IMPORTANCE_LOW)
        )
    }

    override fun onDestroy() {
        webPort?.close()
        overlay?.let { windowManager.removeView(it) }
        webView?.destroy()
        overlay = null; webView = null; webPort = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
