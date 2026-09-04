package com.charpet.app

import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.util.Base64

object CharPetRenderer {
    private val skins = listOf("#f6d2b8", "#e9b995", "#c9825b", "#8f583e")
    private val hair = listOf("#3b2f2a", "#6b3f2a", "#9b6b3f", "#d8a45d", "#b94d68")
    private val outfits = listOf("#f4eee7", "#b8d8d8", "#d8b4d8", "#f0c77a", "#9fb6e3")
    private val marks = listOf("", "♡", "✦", "〰")
    private val accessories = listOf("", "♡", "✦", "☁", "♢")

    fun imageFor(pet: JSONObject): String {
        val creator = pet.optJSONObject("creatorState") ?: return pet.optString("image")
        val custom = creator.optString("customImage")
        if (custom.startsWith("data:image/")) return custom
        return "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(svg(creator).toByteArray(StandardCharsets.UTF_8))
    }

    fun inlineSvgFor(pet: JSONObject): String? {
        val creator = pet.optJSONObject("creatorState") ?: return null
        if (creator.optString("customImage").startsWith("data:image/")) return null
        return svg(creator)
    }

    private fun svg(s: JSONObject): String {
        val skin = skins.getOrElse(s.optInt("skin", 0)) { skins[0] }
        val h = hair.getOrElse(s.optInt("fronthair", 0)) { hair[0] }
        val outfit = outfits.getOrElse(s.optInt("outfit", 0)) { outfits[0] }
        val mark = marks.getOrElse(s.optInt("facemark", 0)) { "" }
        val acc = accessories.getOrElse(s.optInt("accessory", 0)) { "" }
        val eyeGroup = when (s.optInt("eyes", 0)) {
            1 -> "<ellipse cx='94' cy='139' rx='8' ry='10'/><ellipse cx='146' cy='139' rx='8' ry='10'/>"
            2 -> "<circle cx='94' cy='139' r='4'/><circle cx='146' cy='139' r='4'/>"
            3 -> "<path d='M85 140Q94 132 103 140M137 140Q146 132 155 140' fill='none' stroke-width='4' stroke-linecap='round'/>"
            4 -> "<text x='120' y='147' text-anchor='middle' font-size='27'>✦  ✦</text>"
            else -> "<circle cx='94' cy='139' r='7'/><circle cx='146' cy='139' r='7'/>"
        }
        val mouth = when (s.optInt("mouth", 0)) {
            1 -> "<ellipse cx='120' cy='160' rx='9' ry='7' fill='#713f43'/>"
            2 -> "<circle cx='120' cy='160' r='3' fill='#8f5549'/>"
            3 -> "<path d='M108 158l12 7 12-7' fill='none' stroke='#8f5549' stroke-width='3' stroke-linecap='round'/>"
            else -> "<path d='M108 157Q120 166 132 157' fill='none' stroke='#8f5549' stroke-width='4' stroke-linecap='round'/>"
        }
        val ear = if (s.optInt("earhair", 0) == 0) "" else "<path d='M57 103Q34 80 49 58Q72 68 79 99Z M183 103Q206 80 191 58Q168 68 161 99Z' fill='$h'/>"
        val back = if (s.optInt("back1", 0) == 0) "" else "<path d='M48 126Q38 38 120 35Q202 38 192 126Q174 75 120 73Q66 75 48 126Z' fill='${hair.getOrElse(s.optInt("back1")) { hair[0] }}' opacity='.9'/>"
        val back2 = if (s.optInt("back2", 0) == 0) "" else "<path d='M58 94Q30 116 43 172Q52 188 67 164L76 105Z M182 94Q210 116 197 172Q188 188 173 164L164 105Z' fill='${hair.getOrElse(s.optInt("back2")) { hair[0] }}' opacity='.8'/>"
        val outerColors = listOf("#d9d1c8", "#8897b7", "#b87979", "#6f8174")
        val outer = if (s.optInt("outer", 0) == 0) "" else "<path d='M49 257Q51 194 79 188L93 257Z M191 257Q189 194 161 188L147 257Z' fill='${outerColors.getOrElse(s.optInt("outer")) { outerColors[0] }}'/>"
        val face = if (mark.isEmpty()) "" else "<text x='120' y='184' text-anchor='middle' font-size='22' fill='#d77b92'>$mark</text>"
        return """<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 300'>
<style>
.pet-body{transform-box:fill-box;transform-origin:center;animation:petBreath 3.2s ease-in-out infinite}.pet-eyes{animation:petBlink 4.7s ease-in-out infinite}.pet-mouth{transform-box:fill-box;transform-origin:center}.pet-talk .pet-mouth{animation:petTalk .34s ease-in-out infinite alternate}.pet-talk .pet-eyes{animation:none}.pet-talk .pet-eyes{transform:scaleY(.88);transform-origin:center}.pet-sleep .pet-eyes{transform:scaleY(.18);transform-origin:center}.pet-sleep .pet-body{animation:petSleep 2.2s ease-in-out infinite}.pet-happy .pet-body{animation:petHappy .7s ease-in-out 2}.pet-angry .pet-body{animation:petAngry .25s ease-in-out 3}.pet-surprised .pet-body{animation:petPop .55s ease-out}.pet-shy .pet-body{animation:petShy .8s ease-in-out}
@keyframes petBreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.018)}}@keyframes petBlink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.12)}}@keyframes petTalk{from{transform:scaleY(.55)}to{transform:scaleY(1.18)}}@keyframes petSleep{50%{transform:translateY(7px) scale(.97)}}@keyframes petHappy{50%{transform:translateY(-7px) scale(1.08) rotate(-3deg)}}@keyframes petAngry{50%{transform:translateX(5px)}}@keyframes petPop{50%{transform:scale(1.12)}}@keyframes petShy{50%{transform:scale(.94) rotate(2deg)}}
</style>
<g class='pet-body'>
<ellipse cx='120' cy='272' rx='76' ry='14' fill='rgba(30,24,20,.12)'/>
$back2$back$ear<path d='M58 258Q60 194 120 190Q180 194 182 258Z' fill='$outfit'/>$outer
<circle cx='120' cy='124' r='68' fill='$skin'/>
<path d='M52 124Q44 46 120 42Q196 46 188 124Q170 82 120 78Q70 82 52 124Z' fill='$h'/>
<path d='M60 88Q82 45 120 50Q158 45 180 88L170 112Q146 92 120 94Q94 92 70 112Z' fill='$h'/>
<g class='pet-eyes' fill='#332c29' stroke='#332c29'>$eyeGroup</g>
<g class='pet-mouth'>$mouth</g>
$face<text x='120' y='73' text-anchor='middle' font-size='30' fill='#d76d87'>$acc</text>
<circle cx='76' cy='145' r='7' fill='#eaa0a0' opacity='.45'/><circle cx='164' cy='145' r='7' fill='#eaa0a0' opacity='.45'/>
</g></svg>"""
    }
}
