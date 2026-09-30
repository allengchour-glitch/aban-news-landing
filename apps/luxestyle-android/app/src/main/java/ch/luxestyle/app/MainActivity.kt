package ch.luxestyle.app

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import ch.luxestyle.app.ui.LuxeApp
import ch.luxestyle.app.ui.LuxeTheme
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private val links = Channel<String>(Channel.BUFFERED)
    private val shop get() = (application as LuxeApplication).shop

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) handle(intent)
        setContent { LuxeTheme { LuxeApp(shop, links.receiveAsFlow()) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handle(intent)
    }

    /** Nach der Kasse zurück: Warenkorb neu laden (bezahlte Warenkörbe leert Shopify). */
    override fun onResume() {
        super.onResume()
        lifecycleScope.launch { shop.cart.refresh() }
    }

    private fun handle(intent: Intent?) {
        val url = intent?.getStringExtra(EXTRA_URL) ?: intent?.data?.toString() ?: return
        links.trySend(url)
    }

    companion object {
        private const val EXTRA_URL = "url"

        fun intent(context: Context, url: String): Intent =
            Intent(context, MainActivity::class.java)
                .putExtra(EXTRA_URL, url)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
}

