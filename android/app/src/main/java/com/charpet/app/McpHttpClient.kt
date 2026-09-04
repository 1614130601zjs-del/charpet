package com.charpet.app

import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

/** Minimal MCP Streamable HTTP transport for CharPet's semantic event ingress. */
class McpHttpClient(
    private val handler: Handler = Handler(Looper.getMainLooper()),
) {
    private val executor = Executors.newSingleThreadExecutor()
    private val requestId = AtomicInteger(1)
    @Volatile private var running = false
    private var sessionId: String? = null

    var onEvent: ((CharPetEvent) -> Unit)? = null
    var onStatus: ((String) -> Unit)? = null

    fun connect(endpoint: String, token: String? = null) {
        stop()
        val normalized = normalizeEndpoint(endpoint) ?: run {
            handler.post { onStatus?.invoke("MCP 地址无效：需要 /mcp；远程地址必须 HTTPS") }
            return
        }
        running = true
        executor.execute {
            try {
                initialize(normalized, token)
                if (running) handler.post { onStatus?.invoke("MCP 已连接 · /mcp") }
            } catch (error: Exception) {
                if (running) handler.post { onStatus?.invoke("MCP 连接失败：${error.message ?: "未知错误"}") }
            }
        }
    }

    fun stop() {
        running = false
        sessionId = null
    }

    fun destroy() {
        stop()
        executor.shutdownNow()
    }

    fun isRunning(): Boolean = running

    private fun normalizeEndpoint(raw: String): String? {
        val value = raw.trim().trimEnd('/')
        val url = runCatching { URL(value) }.getOrNull() ?: return null
        val protocol = url.protocol.lowercase()
        val host = url.host.lowercase()
        val local = host == "127.0.0.1" || host == "localhost" || host == "::1"
        if (protocol != "https" && !(protocol == "http" && local)) return null
        if (url.path != "/mcp") return null
        return value
    }

    private fun initialize(endpoint: String, token: String?) {
        val result = postJson(endpoint, JSONObject().apply {
            put("jsonrpc", "2.0")
            put("id", requestId.getAndIncrement())
            put("method", "initialize")
            put("params", JSONObject().apply {
                put("protocolVersion", "2025-11-25")
                put("capabilities", JSONObject())
                put("clientInfo", JSONObject().apply {
                    put("name", "CharPet Android")
                    put("version", "0.1.0")
                })
            })
        }.toString(), token)
        sessionId = result.first
        // MCP requires the initialized notification after the initialize response.
        postJson(endpoint, JSONObject().apply {
            put("jsonrpc", "2.0")
            put("method", "notifications/initialized")
            put("params", JSONObject())
        }.toString(), token, allowEmpty = true)
        extractEvents(result.second)
    }

    private fun postJson(endpoint: String, body: String, token: String?, allowEmpty: Boolean = false): Pair<String?, String> {
        val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 7000
            readTimeout = 12000
            doInput = true
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json, text/event-stream")
            sessionId?.let { setRequestProperty("Mcp-Session-Id", it) }
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }
        conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        val code = conn.responseCode
        if (code !in 200..299) throw IllegalStateException("HTTP $code")
        val newSession = conn.getHeaderField("Mcp-Session-Id")
        val text = conn.inputStream.bufferedReader().use { it.readText() }
        if (!allowEmpty && text.isBlank()) throw IllegalStateException("MCP 返回为空")
        return newSession to text
    }

    private fun extractEvents(payload: String) {
        if (payload.isBlank()) return
        // Accept either a JSON-RPC result or JSON-RPC/SSE data lines.
        val candidates = mutableListOf<String>()
        if (payload.trimStart().startsWith("{")) candidates += payload.trim()
        payload.lineSequence().filter { it.startsWith("data:") }.forEach { candidates += it.removePrefix("data:").trim() }
        candidates.forEach { scanJsonForEvent(it) }
    }

    private fun scanJsonForEvent(raw: String) {
        runCatching { JSONObject(raw) }.getOrNull()?.let { scanValue(it) }
    }

    private fun scanValue(value: Any?) {
        when (value) {
            is JSONObject -> {
                CharPetEvent.parse(value.toString())?.let { event -> handler.post { onEvent?.invoke(event) } }
                val keys = value.keys()
                while (keys.hasNext()) scanValue(value.opt(keys.next()))
            }
            is JSONArray -> for (i in 0 until value.length()) scanValue(value.opt(i))
        }
    }
}
