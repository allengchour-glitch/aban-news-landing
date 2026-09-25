package ch.luxestyle.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.net.toUri
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.progressindicator.LinearProgressIndicator

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var swipe: SwipeRefreshLayout
    private lateinit var progress: LinearProgressIndicator
    private lateinit var offline: View
    private lateinit var nav: BottomNavigationView

    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPress = 0L
    private var syncingNav = false

    private val pickFiles = registerForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        fileCallback?.onReceiveValue(uris.toTypedArray())
        fileCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        swipe = findViewById(R.id.swipe)
        progress = findViewById(R.id.progress)
        offline = findViewById(R.id.offline)
        nav = findViewById(R.id.nav)

        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.root)) { v, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            v.setPadding(bars.left, bars.top, bars.right, 0)
            nav.setPadding(0, 0, 0, bars.bottom)
            insets
        }

        setupWebView()
        setupNavigation()

        swipe.setColorSchemeResources(R.color.luxe_bronze)
        swipe.setOnChildScrollUpCallback { _, _ -> web.scrollY > 0 }
        swipe.setOnRefreshListener { web.reload() }
        findViewById<View>(R.id.retry).setOnClickListener { retry() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    web.canGoBack() -> web.goBack()
                    SystemClock.elapsedRealtime() - lastBackPress < 2000 -> finish()
                    else -> {
                        lastBackPress = SystemClock.elapsedRealtime()
                        Toast.makeText(this@MainActivity, R.string.exit_hint, Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState)
        } else {
            load(startUrl(intent))
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.let { load(startUrl(intent)) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    /** Einstieg: geteilter Shop-Link oder die Startseite (mit App-Kennung für die Shop-Statistik). */
    private fun startUrl(intent: Intent?): String {
        val data = intent?.data
        if (data != null && isShopHost(data.host)) return data.toString()
        return HOME.toUri().buildUpon()
            .appendQueryParameter("utm_source", "android_app")
            .appendQueryParameter("utm_medium", "app")
            .build().toString()
    }

    private fun load(url: String) {
        if (!isOnline()) {
            showOffline(true)
            web.tag = url
            return
        }
        showOffline(false)
        web.loadUrl(url)
    }

    private fun retry() {
        val pending = web.tag as? String
        web.tag = null
        if (pending != null) load(pending) else if (isOnline()) {
            showOffline(false)
            web.reload()
        }
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
                syncNav(url)
            }

            override fun onPageFinished(view: WebView, url: String) {
                progress.visibility = View.GONE
                swipe.isRefreshing = false
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    web.tag = request.url.toString()
                    showOffline(true)
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
     * true = Link wird ausserhalb geöffnet. Shop, Checkout und Kundenkonto bleiben in der App;
     * Zahlungs-Apps (TWINT, PayPal …), Mail, Telefon und fremde Seiten gehen an das System.
     */
    private fun routeUrl(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase()
        if (scheme == "http" || scheme == "https") {
            if (isInAppHost(uri.host)) return false
            openExternal(Intent(Intent.ACTION_VIEW, uri))
            return true
        }
        if (scheme == "intent") {
            try {
                val intent = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply {
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

    private fun setupNavigation() {
        nav.setOnItemSelectedListener { item ->
            if (!syncingNav) {
                val path = when (item.itemId) {
                    R.id.nav_shop -> "/collections"
                    R.id.nav_search -> "/search"
                    R.id.nav_cart -> "/cart"
                    R.id.nav_account -> "/account"
                    else -> "/"
                }
                load(HOME.trimEnd('/') + path)
            }
            true
        }
        nav.setOnItemReselectedListener { item ->
            if (item.itemId == R.id.nav_home) load(HOME) else web.scrollTo(0, 0)
        }
    }

    /** Markiert den passenden Tab, wenn im Shop navigiert wird (ohne neu zu laden). */
    private fun syncNav(url: String) {
        val uri = url.toUri()
        val path = uri.path ?: "/"
        val id = when {
            !isShopHost(uri.host) && uri.host?.contains("account") == true -> R.id.nav_account
            path.startsWith("/cart") || path.contains("/checkouts") -> R.id.nav_cart
            path.startsWith("/search") -> R.id.nav_search
            path.startsWith("/account") -> R.id.nav_account
            path.startsWith("/collections") || path.startsWith("/products") -> R.id.nav_shop
            path == "/" || path.isEmpty() -> R.id.nav_home
            else -> return
        }
        if (nav.selectedItemId != id) {
            syncingNav = true
            nav.selectedItemId = id
            syncingNav = false
        }
    }

    private fun showOffline(show: Boolean) {
        offline.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun isOnline(): Boolean {
        val cm = getSystemService(ConnectivityManager::class.java) ?: return true
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    companion object {
        private const val HOME = "https://luxestyle.ch/"

        private val SHOP_HOSTS = setOf("luxestyle.ch", "www.luxestyle.ch")

        /** Shopify-Checkout, Kundenkonto-Portal und Shop Pay laufen auf eigenen Domains. */
        private val IN_APP_SUFFIXES = listOf(
            "luxestyle.ch",
            "luxestyle.com.co",
            "myshopify.com",
            "shopify.com",
            "shop.app",
            "shopifycdn.com",
        )

        fun isShopHost(host: String?) = host != null && host.lowercase() in SHOP_HOSTS

        fun isInAppHost(host: String?): Boolean {
            val h = host?.lowercase() ?: return false
            return IN_APP_SUFFIXES.any { h == it || h.endsWith(".$it") }
        }
    }
}
