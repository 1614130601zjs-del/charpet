package com.charpet.app

import org.json.JSONObject

/** Canonical semantic event shared by native producers and the WebView renderer. */
data class CharPetEvent(
    val action: String,
    val emotion: String = "idle",
    val intensity: Double = 1.0,
    val text: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
) {
    fun toJson(): String = JSONObject().apply {
        put("type", TYPE)
        put("action", action)
        put("emotion", emotion)
        put("intensity", intensity)
        if (text != null) put("text", text)
        put("timestamp", timestamp)
    }.toString()

    companion object {
        const val TYPE = "charpet.event"
        val ACTIONS = setOf("idle", "talk", "tap", "drag", "sleep", "wake")
        val EMOTIONS = setOf("idle", "happy", "sad", "angry", "surprised", "shy", "sleep")

        fun parse(json: String): CharPetEvent? = runCatching {
            val obj = JSONObject(json)
            if (obj.optString("type", TYPE) != TYPE) return null
            val action = obj.optString("action")
            if (action !in ACTIONS) return null
            val emotion = obj.optString("emotion", "idle").ifBlank { "idle" }
            if (emotion !in EMOTIONS) return null
            val intensity = obj.optDouble("intensity", 1.0)
            if (intensity.isNaN() || intensity !in 0.0..1.0) return null
            CharPetEvent(
                action = action,
                emotion = emotion,
                intensity = intensity,
                text = obj.optString("text", null),
                timestamp = obj.optLong("timestamp", System.currentTimeMillis()),
            )
        }.getOrNull()
    }
}
