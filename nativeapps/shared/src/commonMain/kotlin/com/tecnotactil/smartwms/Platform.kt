package com.tecnotactil.smartwms

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform