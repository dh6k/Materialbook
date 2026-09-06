package vip.dh6k.materialbook_fork.utils

import com.multiplatform.webview.request.RequestInterceptor
import com.multiplatform.webview.request.WebRequest
import com.multiplatform.webview.request.WebRequestInterceptResult
import com.multiplatform.webview.web.WebViewNavigator

class ExternalRequestInterceptor(
    private val handleExternalUrl: (String) -> Unit,
    private val tryOpenMessenger: (String) -> Boolean = { false },
) : RequestInterceptor {

    override fun onInterceptUrlRequest(
        request: WebRequest,
        navigator: WebViewNavigator
    ): WebRequestInterceptResult {
        // Messenger deep links can never render anything useful in-WebView: fire the app,
        // go back so no dead entry stays in history, and Reject the request.
        // (Reject alone leaves the download interstitial behind when backing out of
        // Messenger; Modify to about:blank leaves a stuck black screen instead.)
        if (request.isForMainFrame && isMessengerUrl(request.url)) {
            tryOpenMessenger(request.url)
            navigator.navigateBack()
            return WebRequestInterceptResult.Reject
        }

        val internalUrlRegex = Regex(
            """https?://(?!(?:l|lm)\.)[^/]*(?:facebook|messenger)\.com/.*"""
        )
        return if (internalUrlRegex.containsMatchIn(request.url) && request.isForMainFrame) {
            WebRequestInterceptResult.Allow
        } else {
            handleExternalUrl(fbRedirectSanitizer(request.url))
            WebRequestInterceptResult.Reject
        }
    }
}