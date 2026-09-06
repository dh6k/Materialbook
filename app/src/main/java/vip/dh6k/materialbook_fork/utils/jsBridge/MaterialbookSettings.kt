package vip.dh6k.materialbook_fork.utils.jsBridge

import android.webkit.JavascriptInterface

class MaterialbookSettings (
    private val toggleSettings: () -> Unit,
) {
    @JavascriptInterface
    @Suppress("unused")
    fun onSettingsToggle() = toggleSettings()
}