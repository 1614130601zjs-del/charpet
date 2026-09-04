package com.charpet.app

import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicLong

/**
 * Minimal MCP Streamable HTTP transport.
 *
 * CharPet deliberately treats MCP as a transport, not as an animation protocol:
 * JSON-RPC responses/notifications are inspected for canonical charpet.event
 * payloads and everything else stays inside the MCP layer.
 *
 * Remote endpoints must be HTTPS and end in /mcp. Localhost HTTP is allowed for
 * a locally deployed MCP server (for example a server running in Termux).
 */
class McpStreamableHttpClient(
    private val handler: Handler = Handler(Looper.getMainLooper()),
) {
    private val executor = Executors.newSingleThreadExecutor()
    private val ids = AtomicLong(1)
    @Volatile private var running = false
    @Volatile private var sessionId: String? = null
    private var connection: HttpURLConnection? = null

    var onEvent: ((CharPetEvent) -> Unit)? = null
    var onStatus: ((String) -> Unit)? = null

    fun start(endpoint: String, token: String? = null) {
        stop()
        val normalized = validateEndpoint(endpoint)
        running = true
        executor.execute {
            try {
                initialize(normalized, token)
                postStatus("MCP 已连接 · ${normalized.host}")
            } catch (error: Exception) {
                if (running) postStatus("MCP 连接失败：${error.message ?: "未知错误"}")
            }
        }
    }

    fun stop() {
        running = false
        connection?.disconnect()
        connection = null
        sessionId = null
    }

    fun destroy() {
        stop()
        executor.shutdownNow()
    }

    /** Send a JSON-RPC request to the configured MCP endpoint. */
    fun request(method: String, params: JSONObject? = null, token: String? = null) {
        val endpoint = currentEndpoint ?: return
        executor.execute {
            runCatching { postJsonRpc(endpoint, token, method, params, true) }
                .onFailure { error -> if (running) postStatus("MCP 请求失败：${error.message ?: "未知错误"}") }
        }
    }

    private var currentEndpoint: URL? = null

    private fun initialize(endpoint: URL, token: String?) {
        currentEndpoint = endpoint
        val params = JSONObject().apply {
            put("protocolVersion", "2025-11-25")
            put("capabilities", JSONObject())
            put("clientInfo", JSONObject().apply {
                put("name", "CharPet Android")
                put("version", "0.1.0")
            })
        }
        val result = postJsonRpc(endpoint, token, "initialize", params, false)
        result.optString("sessionId").takeIf { it.isNotBlank() }?.let { sessionId = it }
        postJsonRpc(endpoint, token, "notifications/initialized", null, false)
    }

    private fun postJsonRpc(
        endpoint: URL,
        token: String?,
        method: String,
        params: JSONObject?,
        inspectStream: Boolean,
    ): JSONObject {
        val requestId = if (method.startsWith("notifications/")) null else ids.getAndIncrement()
        val body = JSONObject().apply {
            put("jsonrpc", "2.0")
            if (requestId != null) put("id", requestId)
            put("method", method)
            if (params != null) put("params", params)
        }.toString()

        val conn = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 7000
            readTimeout = 30000
            doOutput = true
            doInput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json, text/event-stream")
            sessionId?.let { setRequestProperty("Mcp-Session-Id", it) }
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }
        connection = conn
        OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }

        val code = conn.responseCode
        if (code !in 200..299 && code != 202) throw IllegalStateException("HTTP $code")
        conn.getHeaderField("Mcp-Session-Id")?.takeIf { it.isNotBlank() }?.let { sessionId = it }

        if (code == 202) return JSONObject()
        val contentType = conn.contentType.orEmpty()
        return if (contentType.contains("text/event-stream", ignoreCase = true)) {
            readSse(conn, inspectStream)
        } else {
            val text = conn.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            inspectPayload(text)
        }
    }

    private fun readSse(conn: HttpURLConnection, inspect: Boolean): JSONObject {
        var last = JSONObject()
        conn.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
            var data: StringBuilder? = null
            while (running) {
                val line = reader.readLine() ?: break
                when {
                    line.startsWith("data:") -> {
                        if (data == null) data = StringBuilder()
                        if (data!!.isNotEmpty()) data!!.append('\n')
                        data!!.append(line.removePrefix("data:").trimStart())
                    }
                    line.isEmpty() -> {
                        data?.toString()?.let { payload ->
                            last = inspectPayload(payload, inspect)
                        }
                        data = null
                    }
                }
            }
        }
        return last
    }

    private fun inspectPayload(text: String, inspect: Boolean = true): JSONObject {
        val root = runCatching { JSONObject(text) }.getOrNull() ?: return JSONObject()
        if (inspect) scanForEvent(root)
        return root
    }

    private fun scanForEvent(value: Any?) {
        when (value) {
            is JSONObject -> {
                if (value.optString("type") == CharPetEvent.TYPE) {
                    CharPetEvent.parse(value.toString())?.let { event -> handler.post { onEvent?.invoke(event) } }
                }
                val keys = value.keys()
                while (keys.hasNext()) scanForEvent(value.opt(keys.next()))
            }
            is JSONArray -> for (index in 0 until value.length()) scanForEvent(value.opt(index))
        }
    }

    private fun validateEndpoint(raw: String): URL {
        val value = raw.trim().trimEnd('/')
        val url = URL(value)
        val local = url.host == "127.0.0.1" || url.host == "localhost" || url.host == "::1"
        if (url.path != "/mcp") throw IllegalArgumentException("MCP 地址必须使用 /mcp")
        if (url.protocol != "https" && !local) throw IllegalArgumentException("远程 MCP 只允许 HTTPS")
        if (url.protocol != "http" && url.protocol != "https") throw IllegalArgumentException("MCP 地址必须是 HTTP(S)")
        return url
    }

    private fun postStatus(text: String) = handler.post { onStatus?.invoke(text) }
}
