package com.charpet.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Local-first store. The APK can run without Termux, Render, or Supabase. */
class CharPetStore(private val context: Context) {
    companion object { private const val FILE_NAME = "charpet_pet.json" }
    private val file get() = java.io.File(context.filesDir, FILE_NAME)

    fun saveExport(json: String): Boolean = try {
        val root = JSONObject(json)
        val image = root.optString("image")
        if (!image.startsWith("data:image/")) return false
        val safe = JSONObject().apply {
            put("version", root.optInt("version", 2))
            put("name", root.optString("name", "我的 Char"))
            put("userTitle", root.optString("userTitle", "主人"))
            put("image", image)
            put("source", root.optString("source", "unknown"))
            put("exportedAt", root.optLong("exportedAt", System.currentTimeMillis()))
            root.optJSONObject("creatorState")?.let { put("creatorState", it) }
            root.optJSONObject("assets")?.let { put("assets", it) }
            root.optJSONObject("needs")?.let { put("needs", it) }
            root.optJSONArray("relationship")?.let { put("relationship", it) }
            root.optJSONArray("timeline")?.let { put("timeline", it) }
            root.optJSONArray("diary")?.let { put("diary", it) }
            root.optJSONArray("memories")?.let { put("memories", it) }
        }
        file.writeText(safe.toString(), Charsets.UTF_8)
        true
    } catch (_: Exception) { false }

    fun load(): JSONObject? = try { if (!file.exists()) null else JSONObject(file.readText(Charsets.UTF_8)) } catch (_: Exception) { null }
    fun name(): String = load()?.optString("name", "我的 Char") ?: "我的 Char"
    fun image(): String? = load()?.optString("image")?.takeIf { it.startsWith("data:image/") }

    fun saveLocalState(patch: JSONObject) {
        val root = load() ?: JSONObject()
        patch.keys().forEach { key -> root.put(key, patch.get(key)) }
        file.writeText(root.toString(), Charsets.UTF_8)
    }

    fun assets(): JSONObject = load()?.optJSONObject("assets") ?: JSONObject()
    fun outfits(): JSONArray = assets().optJSONArray("outfits") ?: JSONArray()
    fun currentOutfitId(): String? = assets().optString("currentOutfitId").takeIf { it.isNotBlank() }

    fun setCurrentOutfit(outfitId: String?) {
        val assets = assets()
        if (outfitId.isNullOrBlank()) assets.remove("currentOutfitId") else assets.put("currentOutfitId", outfitId)
        saveLocalState(JSONObject().put("assets", assets))
    }
}
