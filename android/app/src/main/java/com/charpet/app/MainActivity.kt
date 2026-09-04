package com.charpet.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 72, 48, 48)
        }
        val title = TextView(this).apply {
            text = "CharPet · Android Overlay"
            textSize = 24f
        }
        status = TextView(this).apply {
            textSize = 15f
            setPadding(0, 24, 0, 24)
        }
        val button = Button(this).apply {
            text = "启动桌宠"
            setOnClickListener { startPet() }
        }
        val demo = Button(this).apply {
            text = "给桌宠发一句话"
            setOnClickListener {
                startPet()
                sendEvent("{\"type\":\"charpet.event\",\"action\":\"talk\",\"emotion\":\"happy\",\"intensity\":0.8,\"text\":\"Android 收到啦！\"}")
            }
        }
        root.addView(title)
        root.addView(status)
        root.addView(button)
        root.addView(demo)
        setContentView(root)
        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun refreshStatus() {
        status.text = if (Settings.canDrawOverlays(this)) {
            "悬浮窗权限：已开启\n点击按钮即可显示桌宠。"
        } else {
            "悬浮窗权限：未开启\n第一次使用需要允许 CharPet 显示在其他应用上层。"
        }
    }

    private fun startPet() {
        if (!Settings.canDrawOverlays(this)) {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            return
        }
        val intent = Intent(this, OverlayService::class.java)
        startForegroundService(intent)
        refreshStatus()
    }

    private fun sendEvent(json: String) {
        if (!Settings.canDrawOverlays(this)) return
        startForegroundService(Intent(this, OverlayService::class.java).apply {
            action = OverlayService.ACTION_EVENT
            putExtra(OverlayService.EXTRA_EVENT_JSON, json)
        })
    }
}
