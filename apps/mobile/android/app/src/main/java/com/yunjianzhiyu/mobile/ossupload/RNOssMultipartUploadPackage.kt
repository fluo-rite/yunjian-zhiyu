package com.yunjianzhiyu.mobile.ossupload

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfo.Companion.classIsTurboModule
import com.facebook.react.module.model.ReactModuleInfoProvider

class RNOssMultipartUploadPackage : BaseReactPackage() {
  override fun getModule(
      name: String,
      reactContext: ReactApplicationContext,
  ): NativeModule? {
    return when (name) {
      NativeRNOssMultipartUploadSpec.NAME -> RNOssMultipartUploadModule(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    val moduleClass = RNOssMultipartUploadModule::class.java
    val reactModule =
        checkNotNull(moduleClass.getAnnotation(com.facebook.react.module.annotations.ReactModule::class.java)) {
          "RNOssMultipartUploadModule is missing the @ReactModule annotation."
        }

    val moduleInfo =
        ReactModuleInfo(
            reactModule.name,
            moduleClass.name,
            reactModule.canOverrideExistingModule,
            reactModule.needsEagerInit,
            reactModule.isCxxModule,
            classIsTurboModule(moduleClass),
        )

    return ReactModuleInfoProvider { mapOf(reactModule.name to moduleInfo) }
  }
}
