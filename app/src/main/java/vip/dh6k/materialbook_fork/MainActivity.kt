package vip.dh6k.materialbook_fork

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import vip.dh6k.materialbook_fork.ui.screens.MaterialbookWebView
import vip.dh6k.materialbook_fork.ui.theme.MaterialbookTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            val intentUrl = intent?.data?.toString()
            MaterialbookTheme {
                MaterialbookWebView(
                    url = intentUrl
                        ?: "https://facebook.com/"
                )
            }
        }
    }
}