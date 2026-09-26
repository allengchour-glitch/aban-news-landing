package ch.luxestyle.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Ink = Color(0xFF2B2B2B)
val Bronze = Color(0xFF8B6F4E)
val Cream = Color(0xFFFAF7F2)

/** Farben, die Material nicht kennt: gedämpfter Text, Linien, Rabatt-Akzent. */
@Immutable
data class LuxeExtras(val muted: Color, val line: Color, val sale: Color, val card: Color)

val LocalLuxe = staticCompositionLocalOf { LuxeExtras(Color.Gray, Color.LightGray, Color.Red, Color.White) }

private val Light = lightColorScheme(
    primary = Ink, onPrimary = Cream,
    secondary = Bronze, onSecondary = Color.White,
    tertiary = Bronze,
    background = Cream, onBackground = Ink,
    surface = Cream, onSurface = Ink,
    surfaceVariant = Color(0xFFF1ECE4), onSurfaceVariant = Color(0xFF5F5A55),
    surfaceContainer = Color.White, surfaceContainerHigh = Color.White,
    outline = Color(0xFFE6E0D8), outlineVariant = Color(0xFFEFEAE3),
)

private val Dark = darkColorScheme(
    primary = Color(0xFFF2EDE6), onPrimary = Color(0xFF1C1B1A),
    secondary = Color(0xFFC4A27E), onSecondary = Color(0xFF1C1B1A),
    tertiary = Color(0xFFC4A27E),
    background = Color(0xFF151413), onBackground = Color(0xFFF2EDE6),
    surface = Color(0xFF151413), onSurface = Color(0xFFF2EDE6),
    surfaceVariant = Color(0xFF26231F), onSurfaceVariant = Color(0xFFB9B2AA),
    surfaceContainer = Color(0xFF1F1D1B), surfaceContainerHigh = Color(0xFF262320),
    outline = Color(0xFF3A3632), outlineVariant = Color(0xFF2C2926),
)

private val Serif = FontFamily.Serif

private val Type = Typography(
    displaySmall = TextStyle(fontFamily = Serif, fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 38.sp),
    headlineMedium = TextStyle(fontFamily = Serif, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 32.sp),
    headlineSmall = TextStyle(fontFamily = Serif, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 28.sp),
    titleLarge = TextStyle(fontFamily = Serif, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    titleSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 15.sp, letterSpacing = 0.2.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 12.sp, letterSpacing = 0.3.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.6.sp),
)

/** Drei Radien für alles: 8 klein, 14 Karte, Pille. */
object Radius {
    val Small = RoundedCornerShape(8.dp)
    val Card = RoundedCornerShape(14.dp)
    val Pill = RoundedCornerShape(999.dp)
}

@Composable
fun LuxeTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val extras = if (dark) {
        LuxeExtras(muted = Color(0xFFA39D96), line = Color(0xFF33302C), sale = Color(0xFFE08A6D), card = Color(0xFF1F1D1B))
    } else {
        LuxeExtras(muted = Color(0xFF8A8580), line = Color(0xFFE6E0D8), sale = Color(0xFFB4533A), card = Color.White)
    }
    androidx.compose.runtime.CompositionLocalProvider(LocalLuxe provides extras) {
        MaterialTheme(
            colorScheme = if (dark) Dark else Light,
            typography = Type,
            shapes = Shapes(small = Radius.Small, medium = Radius.Card, large = Radius.Card),
            content = content,
        )
    }
}
