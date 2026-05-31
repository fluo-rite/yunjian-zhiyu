package com.yunjianzhiyu.mobile.ossupload

import android.net.Uri
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import com.facebook.react.bridge.WritableMap
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

private const val ERR_INVALID_FILE_URI = "ERR_INVALID_FILE_URI"
private const val ERR_FILE_NOT_FOUND = "ERR_FILE_NOT_FOUND"
private const val ERR_RANGE_INVALID = "ERR_RANGE_INVALID"
private const val ERR_REQUEST_CANCELLED = "ERR_REQUEST_CANCELLED"
private const val ERR_HTTP_STATUS = "ERR_HTTP_STATUS"
private const val ERR_ETAG_MISSING = "ERR_ETAG_MISSING"
private const val ERR_NATIVE_UNKNOWN = "ERR_NATIVE_UNKNOWN"

private data class UploadPartInput(
    val requestId: String,
    val fileUri: String,
    val partUrl: String,
    val offset: Long,
    val length: Long,
    val partNumber: Int,
    val contentType: String?,
    val headers: Map<String, String>,
)

private data class ActiveUpload(
    val cancelled: AtomicBoolean = AtomicBoolean(false),
    @Volatile var connection: HttpURLConnection? = null,
)

private class NativeUploadException(
    val code: String,
    override val message: String,
) : RuntimeException(message)

@ReactModule(name = NativeRNOssMultipartUploadSpec.NAME)
class RNOssMultipartUploadModule(reactContext: ReactApplicationContext) :
    NativeRNOssMultipartUploadSpec(reactContext) {

  private val executor: ExecutorService = Executors.newCachedThreadPool()
  private val activeUploads = ConcurrentHashMap<String, ActiveUpload>()

  override fun uploadPart(input: ReadableMap, promise: Promise) {
    val uploadInput =
        try {
          parseUploadPartInput(input)
        } catch (error: NativeUploadException) {
          promise.reject(error.code, error.message)
          return
        } catch (error: Exception) {
          promise.reject(ERR_NATIVE_UNKNOWN, error.message, error)
          return
        }

    val activeUpload = ActiveUpload()
    val existingUpload = activeUploads.putIfAbsent(uploadInput.requestId, activeUpload)
    if (existingUpload != null) {
      promise.reject(ERR_NATIVE_UNKNOWN, "A multipart upload with the same requestId is already running.")
      return
    }

    executor.execute {
      try {
        val result = uploadPartInternal(uploadInput, activeUpload)
        promise.resolve(result)
      } catch (error: NativeUploadException) {
        promise.reject(error.code, error.message)
      } catch (error: Exception) {
        promise.reject(ERR_NATIVE_UNKNOWN, error.message, error)
      } finally {
        activeUploads.remove(uploadInput.requestId)
        activeUpload.connection?.disconnect()
      }
    }
  }

  override fun cancelPartUpload(requestId: String, promise: Promise) {
    val activeUpload = activeUploads[requestId]
    activeUpload?.cancelled?.set(true)
    activeUpload?.connection?.disconnect()
    promise.resolve(null)
  }

  override fun getUploadFeatureFlags(): WritableMap {
    return Arguments.createMap().apply {
      putBoolean("supportsNativeMultipartPartUpload", true)
      putBoolean("supportsBackgroundUpload", false)
      putBoolean("supportsResumeAcrossLaunch", false)
    }
  }

  override fun invalidate() {
    activeUploads.values.forEach {
      it.cancelled.set(true)
      it.connection?.disconnect()
    }
    activeUploads.clear()
    executor.shutdownNow()
    super.invalidate()
  }

  private fun uploadPartInternal(input: UploadPartInput, activeUpload: ActiveUpload): WritableMap {
    ensureNotCancelled(activeUpload)

    val file = resolveFile(input.fileUri)
    if (!file.exists() || !file.isFile) {
      throw NativeUploadException(ERR_FILE_NOT_FOUND, "The upload file does not exist.")
    }

    val fileSize = file.length()
    if (input.offset < 0 || input.length <= 0 || input.offset + input.length > fileSize) {
      throw NativeUploadException(ERR_RANGE_INVALID, "The requested byte range is invalid.")
    }

    val connection = (URL(input.partUrl).openConnection() as HttpURLConnection).apply {
      requestMethod = "PUT"
      doOutput = true
      connectTimeout = 30000
      readTimeout = 30000
      useCaches = false
      setFixedLengthStreamingMode(input.length)
      input.contentType?.takeIf { it.isNotBlank() }?.let { setRequestProperty("Content-Type", it) }
      input.headers.forEach { (key, value) -> setRequestProperty(key, value) }
    }
    activeUpload.connection = connection

    try {
      connection.outputStream.use { outputStream ->
        RandomAccessFile(file, "r").use { randomAccessFile ->
          randomAccessFile.seek(input.offset)
          val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
          var remaining = input.length
          var bytesSent = 0L

          while (remaining > 0) {
            ensureNotCancelled(activeUpload)

            val bytesToRead = minOf(buffer.size.toLong(), remaining).toInt()
            val bytesRead = randomAccessFile.read(buffer, 0, bytesToRead)
            if (bytesRead < 0) {
              throw NativeUploadException(ERR_NATIVE_UNKNOWN, "The source file ended before the requested range.")
            }

            outputStream.write(buffer, 0, bytesRead)
            remaining -= bytesRead.toLong()
            bytesSent += bytesRead.toLong()
          }

          outputStream.flush()

          val statusCode = connection.responseCode
          if (statusCode !in 200..299) {
            val responseSnippet = readResponseSnippet(connection)
            throw NativeUploadException(
                ERR_HTTP_STATUS,
                "OSS part upload failed with status $statusCode${if (responseSnippet.isBlank()) "" else ": $responseSnippet"}",
            )
          }

          val etag =
              (
                      connection.getHeaderField("ETag")
                          ?: connection.getHeaderField("etag")
                          ?: ""
                      )
                  .trim()
                  .trim('"')
          if (etag.isBlank()) {
            throw NativeUploadException(
                ERR_ETAG_MISSING,
                "OSS part upload completed but did not return an ETag header.",
            )
          }

          return Arguments.createMap().apply {
            putString("requestId", input.requestId)
            putInt("partNumber", input.partNumber)
            putString("etag", etag)
            putInt("statusCode", statusCode)
            putDouble("bytesSent", bytesSent.toDouble())
          }
        }
      }
    } catch (error: NativeUploadException) {
      throw error
    } catch (error: IOException) {
      if (activeUpload.cancelled.get()) {
        throw NativeUploadException(ERR_REQUEST_CANCELLED, "The multipart upload request was cancelled.")
      }
      throw error
    } finally {
      connection.disconnect()
      activeUpload.connection = null
    }
  }

  private fun ensureNotCancelled(activeUpload: ActiveUpload) {
    if (activeUpload.cancelled.get()) {
      throw NativeUploadException(ERR_REQUEST_CANCELLED, "The multipart upload request was cancelled.")
    }
  }

  private fun resolveFile(fileUri: String): File {
    if (fileUri.isBlank()) {
      throw NativeUploadException(ERR_INVALID_FILE_URI, "fileUri must not be empty.")
    }

    val parsedUri = Uri.parse(fileUri)
    val scheme = parsedUri.scheme
    if (scheme.isNullOrEmpty()) {
      return File(fileUri)
    }
    if (scheme != "file") {
      throw NativeUploadException(
          ERR_INVALID_FILE_URI,
          "Only local file:// URIs are supported for multipart upload.",
      )
    }

    val path = parsedUri.path
    if (path.isNullOrBlank()) {
      throw NativeUploadException(ERR_INVALID_FILE_URI, "The file URI is missing a local path.")
    }
    return File(path)
  }

  private fun parseUploadPartInput(input: ReadableMap): UploadPartInput {
    val requestId = input.getString("requestId")?.trim().orEmpty()
    val fileUri = input.getString("fileUri")?.trim().orEmpty()
    val partUrl = input.getString("partUrl")?.trim().orEmpty()
    val offset = input.getDouble("offset").toLong()
    val length = input.getDouble("length").toLong()
    val partNumber = input.getDouble("partNumber").toInt()
    val contentType =
        if (input.hasKey("contentType") && !input.isNull("contentType")) {
          input.getString("contentType")?.trim()
        } else {
          null
        }

    if (requestId.isBlank()) {
      throw NativeUploadException(ERR_NATIVE_UNKNOWN, "requestId must not be empty.")
    }
    if (fileUri.isBlank()) {
      throw NativeUploadException(ERR_INVALID_FILE_URI, "fileUri must not be empty.")
    }
    if (partUrl.isBlank()) {
      throw NativeUploadException(ERR_NATIVE_UNKNOWN, "partUrl must not be empty.")
    }
    if (partNumber <= 0) {
      throw NativeUploadException(ERR_NATIVE_UNKNOWN, "partNumber must be greater than 0.")
    }

    return UploadPartInput(
        requestId = requestId,
        fileUri = fileUri,
        partUrl = partUrl,
        offset = offset,
        length = length,
        partNumber = partNumber,
        contentType = contentType,
        headers = readHeaders(input),
    )
  }

  private fun readHeaders(input: ReadableMap): Map<String, String> {
    if (!input.hasKey("headers") || input.isNull("headers")) {
      return emptyMap()
    }

    val readableHeaders = input.getMap("headers") ?: return emptyMap()
    val headers = mutableMapOf<String, String>()
    val iterator: ReadableMapKeySetIterator = readableHeaders.keySetIterator()
    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      val value = readableHeaders.getString(key)
      if (!key.isNullOrBlank() && !value.isNullOrBlank()) {
        headers[key] = value
      }
    }
    return headers
  }

  private fun readResponseSnippet(connection: HttpURLConnection): String {
    val stream = connection.errorStream ?: connection.inputStream ?: return ""
    return try {
      stream.bufferedReader().use { it.readText().trim().take(500) }
    } catch (_: Exception) {
      ""
    }
  }
}
