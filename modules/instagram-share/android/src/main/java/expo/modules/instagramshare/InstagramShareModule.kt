package expo.modules.instagramshare

import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class InstagramShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("InstagramShare")
    AsyncFunction("open") { uri: String ->
      val activity = requireNotNull(appContext.currentActivity)
      val folder = File(activity.cacheDir, "instagram-share").apply { mkdirs() }
      folder.listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > 86400000L }?.forEach { it.delete() }
      val image = File.createTempFile("books-", ".png", folder)
      File(requireNotNull(Uri.parse(uri).path)).copyTo(image, overwrite = true)
      val stream = FileProvider.getUriForFile(activity, activity.packageName + ".SharingFileProvider", image)
      activity.startActivity(Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        setPackage("com.instagram.android")
        putExtra(Intent.EXTRA_STREAM, stream)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      })
    }
  }
}
