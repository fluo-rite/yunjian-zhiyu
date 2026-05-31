package com.yunjianzhiyu.mobile.ossupload

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.yunjianzhiyu.mobile.BuildConfig

class RNOssMultipartUploadPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == NativeRNOssMultipartUploadSpec.NAME) {
      RNOssMultipartUploadModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      mapOf(
          NativeRNOssMultipartUploadSpec.NAME to ReactModuleInfo(
              NativeRNOssMultipartUploadSpec.NAME,
              NativeRNOssMultipartUploadSpec.NAME,
              false,
              false,
              false,
              isTurboModule,
          ),
      )
    }
  }
}
