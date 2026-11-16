package app.dsiacademy.player

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import androidx.media3.ui.PlayerView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/** Surface vidéo : PlayerView Media3 branché sur le lecteur partagé. */
class DsiVideoView(context: Context) : FrameLayout(context) {
  private val playerView = PlayerView(context).apply {
    useController = false
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  private val relayout = Runnable {
    measure(
      View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY),
    )
    layout(left, top, right, bottom)
  }

  init {
    addView(playerView)
    playerView.player = PlayerHolder.get(context)
  }

  /** React Native ne relance pas la mise en page des vues natives imbriquées. */
  override fun requestLayout() {
    super.requestLayout()
    post(relayout)
  }

  fun detach() {
    playerView.player = null
  }
}

class DsiVideoViewManager : SimpleViewManager<DsiVideoView>() {
  override fun getName() = "DsiVideoView"

  override fun createViewInstance(reactContext: ThemedReactContext) = DsiVideoView(reactContext)

  override fun onDropViewInstance(view: DsiVideoView) {
    view.detach()
    super.onDropViewInstance(view)
  }
}
