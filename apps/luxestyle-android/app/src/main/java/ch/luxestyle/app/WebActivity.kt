package ch.luxestyle.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.progressindicator.LinearProgressIndicator

/**
 * Kasse, Kundenkonto und Seiten ohne native Entsprechung (Rechtstexte, Motiv-Editor).
 * Alles andere läuft nativ in [MainActivity].
 */
class WebActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var progress: LinearProgressIndicator
    private lateinit var offline: View
    private lateinit var title: TextView
    private lateinit var lock: View
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val pickFiles = registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        fileCallback?.onReceiveValue(uris.toTypedArray())
        fileCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_web)

        web = findViewById(R.id.web)
        swipe = findViewById(R.id.swipe)
        progress = findViewById(R.id.progress)
        offline = findViewById(R.id.offline)
        title = findViewById(R.id.title)
        lock = findViewById(R.id.lock)
        title.text = intent.getStringExtra(EXTRA_TITLE).orEmpty()

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }

        findViewById<View>(R.id.close).setOnClickListener { finish() }
        findViewById<View>(R.id.retry).setOnClickListener { load(web.url ?: startUrl()) }
        swipe.setColorSchemeResources(R.color.luxe_bronze)
        swipe.setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }
        swipe.setOnRefreshListener { web.reload() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })

        setupWebView()
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else load(startUrl())
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    private fun startUrl() = intent.getStringExtra(EXTRA_URL) ?: Links.HOME

    private fun load(url: String) {
        offline.visibility = View.GONE
        web.loadUrl(url)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(web, true) // Shopify-Checkout, Kundenkonto, Zahlungsanbieter
        }
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = true
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString LuxeStyleApp/${BuildConfig.VERSION_NAME}"
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                routeUrl(request.url)

            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                progress.visibility = View.VISIBLE
                lock.visibility = if (url.contains("/checkouts/")) View.VISIBLE else View.GONE
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                swipe.isRefreshing = false
                if (intent.getStringExtra(EXTRA_TITLE).isNullOrEmpty()) {
                    title.text = view.title?.substringBefore(" – ")?.substringBefore(" | ").orEmpty()
                }
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    offline.visibility = View.VISIBLE
                    swipe.isRefreshing = false
                }
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progress.setProgressCompat(newProgress, true)
            }

            // Upload im Motiv-Editor (selbst gestalten)
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val type = params.acceptTypes.firstOrNull { it.isNotBlank() } ?: "*/*"
                return try {
                    pickFiles.launch(type)
                    true
                } catch (e: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }
        }
    }

    /**
     * true = Link wird nicht in dieser Web-Ansicht geöffnet. Produkt- und Kategorie-Links gehen in die
     * native App, Zahlungs-Apps (TWINT, PayPal …), Mail, Telefon und fremde Seiten an das System.
     */
    private fun routeUrl(uri: Uri): Boolean {
        val url = uri.toString()
        val scheme = uri.scheme?.lowercase()
        if (scheme == "http" || scheme == "https") {
            val d = Links.destination(url)
            if (d !is Destination.Web) {
                startActivity(MainActivity.intent(this, url))
                // Produkt/Kategorie öffnen darüber (z. B. aus der Bestellübersicht), sonst ist das Web fertig
                if (d !is Destination.Product && d !is Destination.Collection) finish()
                return true
            }
            if (Links.isInAppHost(uri.host)) return false
            openExternal(Intent(Intent.ACTION_VIEW, uri))
            return true
        }
        if (scheme == "intent") {
            try {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
                try {
                    startActivity(intent)
                } catch (e: ActivityNotFoundException) {
                    val fallback = intent.getStringExtra("browser_fallback_url")
                    if (fallback != null) web.loadUrl(fallback)
                    else intent.`package`?.let {
                        openExternal(Intent(Intent.ACTION_VIEW, "market://details?id=$it".toUri()))
                    }
                }
            } catch (e: Exception) {
                toastNoApp()
            }
            return true
        }
        openExternal(Intent(Intent.ACTION_VIEW, uri))
        return true
    }

    private fun openExternal(intent: Intent) {
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            toastNoApp()
        }
    }

    private fun toastNoApp() = Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show()

    companion object {
        private const val EXTRA_URL = "url"
        private const val EXTRA_TITLE = "title"

        fun intent(context: Context, url: String, title: String? = null): Intent =
            Intent(context, WebActivity::class.java)
                .putExtra(EXTRA_URL, Links.tagged(url))
                .putExtra(EXTRA_TITLE, title)
    }
}
