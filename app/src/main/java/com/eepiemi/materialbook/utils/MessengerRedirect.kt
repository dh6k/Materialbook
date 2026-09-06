package com.eepiemi.materialbook.utils

import android.content.Context
import android.content.Intent
import androidx.core.net.toUri

const val DEFAULT_MESSENGER_PACKAGE = "com.facebook.orca"

/** True for URLs the Messenger app handles: deep links, short links, message threads. */
fun isMessengerUrl(url: String): Boolean {
    val uri = runCatching { url.toUri() }.getOrNull() ?: return false
    when (uri.scheme?.lowercase()) {
        "fb-messenger", "fb-messenger-share" -> return true
        "intent" -> {
            // e.g. intent://...#Intent;package=com.facebook.orca;... from FB web buttons
            val pkg = runCatching { Intent.parseUri(url, Intent.URI_INTENT_SCHEME).`package` }
                .getOrNull() ?: return false
            return pkg != null && ("orca" in pkg || "messenger" in pkg || "mlite" in pkg)
        }
        "http", "https" -> { /* host check below */ }
        else -> return false
    }
    val host = (uri.host ?: "").lowercase()
    if (host == "m.me" || host.endsWith(".m.me")) return true
    if (host == "messenger.com" || host.endsWith(".messenger.com")) return true
    if ("facebook" in host && (uri.path ?: "").startsWith("/messages")) return true
    return false
}

/**
 * Opens [url] in the Messenger app ([packageName], default com.facebook.orca).
 * Falls back to the app's launcher entry so even an unresolvable link lands in Messenger.
 * Returns false when the app isn't installed — caller keeps the previous fallback.
 */
fun openMessenger(context: Context, url: String, packageName: String): Boolean {
    val pkg = packageName.ifBlank { DEFAULT_MESSENGER_PACKAGE }
    val targeted = runCatching {
        val base = if (url.startsWith("intent:", ignoreCase = true)) {
            Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
        } else {
            Intent(Intent.ACTION_VIEW, url.toUri())
        }
        base.setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(base)
    }.isSuccess
    if (targeted) return true
    val launch = context.packageManager.getLaunchIntentForPackage(pkg) ?: return false
    return runCatching { context.startActivity(launch) }.isSuccess
}
