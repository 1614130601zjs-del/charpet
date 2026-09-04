package com.charpet.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var status: TextView
    private lateinit var mcpUrl: EditText
    private lateinit var mcpToken: EditText
    private lateinit var store: CharPetStore

    private val importPet = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@registerForActivityResult
        try {
            val json = contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
            status.text = if (json != null && store.saveExport(json)) "角色已导入：${store.name()}\n现在可以启动悬浮桌宠。" else "导入失败：请选择 CharPet 导出的 .charpet.json 文件。"
        } catch (_: Exception) { status.text = "导入失败：无法读取这个角色文件。" }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = CharPetStore(this)
        val prefs = getSharedPreferences("charpet_overlay", MODE_PRIVATE)
        val root = LinearLayout(this).apply { orientation=LinearLayout.VERTICAL; setPadding(48,72,48,48) }
        val title = TextView(this).apply { text="CharPet · Android Overlay"; textSize=24f }
        status = TextView(this).apply { textSize=15f; setPadding(0,24,0,16) }
        mcpUrl = EditText(this).apply { hint="MCP 地址（必须 /mcp）"; inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI; setText(prefs.getString("mcp_url", "")) }
        mcpToken = EditText(this).apply { hint="Bearer Token（可选）"; inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD; setText(prefs.getString("mcp_token", "")) }
        val saveMcp = Button(this).apply { text="保存并连接 MCP"; setOnClickListener { connectMcp() } }
        val stopMcp = Button(this).apply { text="断开 MCP"; setOnClickListener { sendService(OverlayService.ACTION_MCP_STOP); status.text="MCP：已断开（桌宠本地行为仍继续）" } }
        val start = Button(this).apply { text="启动桌宠"; setOnClickListener { startPet() } }
        val stop = Button(this).apply { text="停止桌宠"; setOnClickListener { stopPet() } }
        val import = Button(this).apply { text="导入 Web Studio 角色"; setOnClickListener { importPet.launch(arrayOf("application/json","text/plain","*/*")) } }
        val demo = Button(this).apply { text="给桌宠发一句话"; setOnClickListener { sendEvent("{\"type\":\"charpet.event\",\"action\":\"talk\",\"emotion\":\"happy\",\"intensity\":0.8,\"text\":\"Android 收到啦！\"}") } }
        root.addView(title);root.addView(status);root.addView(mcpUrl);root.addView(mcpToken);root.addView(saveMcp);root.addView(stopMcp);root.addView(start);root.addView(stop);root.addView(import);root.addView(demo)
        setContentView(root); refreshStatus()
    }

    override fun onResume(){super.onResume();refreshStatus()}

    private fun refreshStatus(){val pet=store.image();status.text=if(Settings.canDrawOverlays(this)){"悬浮窗权限：已开启\n角色：${if(pet!=null)store.name() else "尚未导入"}\nMCP：${if(mcpUrl.text.toString().isBlank())"未配置" else mcpUrl.text}"}else{"悬浮窗权限：未开启\n第一次使用需要允许 CharPet 显示在其他应用上层。"}}

    private fun validMcpEndpoint(raw:String):Boolean{val value=raw.trim().trimEnd('/');val uri=runCatching{Uri.parse(value)}.getOrNull()?:return false;if(uri.path!="/mcp")return false;val scheme=uri.scheme?.lowercase();val host=uri.host?.lowercase();val local=host=="127.0.0.1"||host=="localhost"||host=="::1";return scheme=="https"||(scheme=="http"&&local)}

    private fun connectMcp(){val endpoint=mcpUrl.text.toString().trim().trimEnd('/');if(!validMcpEndpoint(endpoint)){status.text="MCP 地址无效：远程必须 HTTPS，路径必须 /mcp；本机可使用 localhost / 127.0.0.1。";return};getSharedPreferences("charpet_overlay",MODE_PRIVATE).edit().putString("mcp_url",endpoint).putString("mcp_token",mcpToken.text.toString()).apply();if(!Settings.canDrawOverlays(this)){status.text="请先开启悬浮窗权限，再连接 MCP。";return};sendService(OverlayService.ACTION_MCP_START,endpoint,mcpToken.text.toString());status.text="MCP：正在连接 $endpoint"}

    private fun startPet(){if(!Settings.canDrawOverlays(this)){startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:$packageName")));return};startForegroundService(Intent(this,OverlayService::class.java));refreshStatus()}
    private fun stopPet(){stopService(Intent(this,OverlayService::class.java).apply{action=OverlayService.ACTION_STOP});refreshStatus()}
    private fun sendEvent(json:String){if(!Settings.canDrawOverlays(this))return;startForegroundService(Intent(this,OverlayService::class.java).apply{action=OverlayService.ACTION_EVENT;putExtra(OverlayService.EXTRA_EVENT_JSON,json)})}
    private fun sendService(action:String,url:String?=null,token:String?=null){startForegroundService(Intent(this,OverlayService::class.java).apply{this.action=action;if(url!=null)putExtra(OverlayService.EXTRA_MCP_URL,url);if(token!=null)putExtra(OverlayService.EXTRA_MCP_TOKEN,token)})}
}
