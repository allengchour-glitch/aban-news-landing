package ch.luxestyle.app

import android.app.Application
import ch.luxestyle.app.data.Shop
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade

class LuxeApplication : Application(), SingletonImageLoader.Factory {
    val shop by lazy { Shop(this) }

    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(OkHttpNetworkFetcherFactory(callFactory = { shop.http })) }
            .crossfade(true)
            .build()
}
