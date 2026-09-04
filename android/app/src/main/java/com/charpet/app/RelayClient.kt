package com.charpet.app

import android.os.Handler
import android.os.Looper
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/** Lightweight SSE client for the local CharPet MCP Relay. */
class RelayClient(
    private val handler: Handler = Handler(Looper.getMainLooper()),
) {
    private val executor = Executors.newSingleThreadExecutor()
    @Volatile private var running = false
    private var connection: HttpURLConnection? = null

    var onEvent: ((CharPetEvent) -> Unit)? = null
    var onStatus: ((String) -> Unit)? = null

    fun start(baseUrl: String, token: String? = null) {
        stop()
        running = true
        executor.execute {
            var delay = 1000L
            while (running) {
                try {
                    connect(baseUrl.trimEnd('/'), token)
                    delay = 1000L
                } catch (error: Exception) {
                    if (running) handler.post { onStatus?.invoke("Relay 连接失败，${delay / 1000}s 后重试") }
                    sleep(delay)
                    delay = (delay * 2).coerceAtMost(15000L)
                }
            }
        }
    }

    fun stop() {
        running = false
        connection?.disconnect()
        connection = null
    }

    fun destroy() {
        stop()
        executor.shutdownNow()
    }

    private fun connect(baseUrl: String, token: String?) {
        val url = URL("$baseUrl/events")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 5000
            readTimeout = 0
            doInput = true
            setRequestProperty("Accept", "text/event-stream")
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
        }
        connection = conn
        val code = conn.responseCode
        if (code !in 200..299) throw IllegalStateException("HTTP $code")
        handler.post { onStatus?.invoke("Relay 已连接") }

        conn.inputStream.bufferedReader().use { reader ->
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
                        data?.toString()?.let { deliver(it) }
                        data = null
                    }
                }
            }
        }
        if (running) throw IllegalStateException("Relay stream closed")
    }

    private fun deliver(json: String) {
        CharPetEvent.parse(json)?.let { event ->
            handler.post { onEvent?.invoke(event) }
        }
    }

    private fun sleep(ms: Long) {
        try { Thread.sleep(ms) } catch (_: InterruptedException) { Thread.currentThread().interrupt() }
    }
}
