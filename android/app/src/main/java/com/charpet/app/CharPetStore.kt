package com.charpet.app

import android.content.Context
import org.json.JSONObject

class CharPetStore(private val context: Context) {
    companion object {
        private const val FILE_NAME = "charpet_pet.json"
    }

    private val file get() = java.io.File(context.filesDir, FILE_NAME)

    fun saveExport(json: String): Boolean {
        return try {
            val root = JSONObject(json)
            val image = root.optString("image")
            if (!image.startsWith("data:image/")) return false
            val safe = JSONObject().apply {
                put("version", root.optInt("version", 1))
                put("name", root.optString("name", "我的 Char"))
                put("image", image)
                put("source", root.optString("source", "unknown"))
                put("exportedAt", root.optLong("exportedAt", System.currentTimeMillis()))
                root.optJSONObject("creatorState")?.let { put("creatorState", it) }
            }
            file.writeText(safe.toString(), Charsets.UTF_8)
            true
        } catch (_: Exception) {
            false
        }
    }

    fun load(): JSONObject? {
        return try {
            if (!file.exists()) null else JSONObject(file.readText(Charsets.UTF_8))
        } catch (_: Exception) {
            null
        }
    }

    fun name(): String = load()?.optString("name", "我的 Char") ?: "我的 Char"
    fun image(): String? = load()?.optString("image")?.takeIf { it.startsWith("data:image/") }
}
