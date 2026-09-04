package com.charpet.app

import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * Small local life-loop for the overlay pet.
 * It intentionally does not depend on MCP/network state.
 */
class AutonomousPetRuntime(
    private val handler: Handler = Handler(Looper.getMainLooper()),
    private val random: Random = Random.Default,
) {
    data class Move(val x: Int, val y: Int, val action: String = "idle", val emotion: String = "idle")

    private var running = false
    private var paused = false
    private var x = 0
    private var y = 0
    private var vx = 1
    private var screenWidth = 1080
    private var screenHeight = 1920
    private var petSize = 220
    private var nextDecisionAt = 0L

    var onMove: ((Move) -> Unit)? = null
    var onEvent: ((CharPetEvent) -> Unit)? = null

    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            if (!paused) step()
            handler.postDelayed(this, 120L)
        }
    }

    fun start(initialX: Int, initialY: Int, screenWidth: Int, screenHeight: Int, petSize: Int) {
        this.x = initialX
        this.y = initialY
        this.screenWidth = max(1, screenWidth)
        this.screenHeight = max(1, screenHeight)
        this.petSize = max(1, petSize)
        this.vx = if (random.nextBoolean()) 1 else -1
        this.nextDecisionAt = System.currentTimeMillis() + random.nextLong(1800L, 4200L)
        if (!running) {
            running = true
            handler.removeCallbacks(tick)
            handler.post(tick)
        }
    }

    fun stop() {
        running = false
        handler.removeCallbacks(tick)
    }

    fun setPaused(value: Boolean) {
        paused = value
    }

    fun syncPosition(x: Int, y: Int) {
        this.x = x
        this.y = y
    }

    private fun step() {
        val now = System.currentTimeMillis()
        if (now >= nextDecisionAt) {
            chooseBehaviour()
            nextDecisionAt = now + random.nextLong(1800L, 5000L)
        }

        val maxX = max(0, screenWidth - petSize)
        val maxY = max(0, screenHeight - petSize)
        val edgeTop = 0
        val edgeBottom = maxY
        val edgeLeft = 0
        val edgeRight = maxX

        // Walk along a screen edge: top -> right -> bottom -> left.
        when (edgeSide()) {
            0 -> { x += vx * 5; y = edgeTop; if (x >= edgeRight) { x = edgeRight; vx = -1 }; if (x <= edgeLeft) { x = edgeLeft; vx = 1 } }
            1 -> { y += vx * 5; x = edgeRight; if (y >= edgeBottom) { y = edgeBottom; vx = -1 }; if (y <= edgeTop) { y = edgeTop; vx = 1 } }
            2 -> { x -= vx * 5; y = edgeBottom; if (x <= edgeLeft) { x = edgeLeft; vx = -1 }; if (x >= edgeRight) { x = edgeRight; vx = 1 } }
            else -> { y -= vx * 5; x = edgeLeft; if (y <= edgeTop) { y = edgeTop; vx = -1 }; if (y >= edgeBottom) { y = edgeBottom; vx = 1 } }
        }
        x = min(max(x, 0), maxX)
        y = min(max(y, 0), maxY)
        onMove?.invoke(Move(x, y))
    }

    private fun edgeSide(): Int {
        val maxX = max(1, screenWidth - petSize)
        val maxY = max(1, screenHeight - petSize)
        val nearLeft = x <= 8
        val nearRight = x >= maxX - 8
        val nearTop = y <= 8
        val nearBottom = y >= maxY - 8
        return when {
            nearTop && !nearRight -> 0
            nearRight && !nearBottom -> 1
            nearBottom && !nearLeft -> 2
            else -> 3
        }
    }

    private fun chooseBehaviour() {
        when (random.nextInt(5)) {
            0 -> onEvent?.invoke(CharPetEvent("idle", "idle", 0.35))
            1 -> onEvent?.invoke(CharPetEvent("tap", "happy", 0.65, "自己晃一晃～"))
            2 -> onEvent?.invoke(CharPetEvent("talk", "happy", 0.55, "我在这里哦"))
            3 -> onEvent?.invoke(CharPetEvent("idle", "surprised", 0.7))
            4 -> onEvent?.invoke(CharPetEvent("sleep", "sleep", 0.35))
        }
    }
}
