cmake_minimum_required(VERSION 3.13)

project(appmodules)

set(CMAKE_VERBOSE_MAKEFILE on)

include(${REACT_ANDROID_DIR}/cmake-utils/folly-flags.cmake)

set(REACT_COMMON_DIR ${REACT_ANDROID_DIR}/../ReactCommon)
include(${REACT_COMMON_DIR}/cmake-utils/react-native-flags.cmake)

find_program(CCACHE_FOUND ccache)
if(CCACHE_FOUND)
  set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)
  set_property(GLOBAL PROPERTY RULE_LAUNCH_LINK ccache)
endif()

# Disable IPO/LTO auto-detection for Android builds on Windows.
# The default RN check can inject '-fuse-ld=gold', which is not supported by this NDK toolchain.
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION FALSE)

set(BUILD_DIR ${PROJECT_BUILD_DIR})
file(TO_CMAKE_PATH "${BUILD_DIR}" BUILD_DIR)
file(TO_CMAKE_PATH "${REACT_ANDROID_DIR}" REACT_ANDROID_DIR)

if (PROJECT_ROOT_DIR)
endif()

file(GLOB override_cpp_SRC CONFIGURE_DEPENDS *.cpp)
if(override_cpp_SRC)
  file(GLOB input_SRC CONFIGURE_DEPENDS
    *.cpp
    ${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp)
else()
  file(GLOB input_SRC CONFIGURE_DEPENDS
    ${REACT_ANDROID_DIR}/cmake-utils/default-app-setup/*.cpp
    ${BUILD_DIR}/generated/autolinking/src/main/jni/*.cpp)
endif()

add_library(${CMAKE_PROJECT_NAME} SHARED ${input_SRC})

target_include_directories(${CMAKE_PROJECT_NAME}
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni)

target_compile_reactnative_options(${CMAKE_PROJECT_NAME} PRIVATE)

find_package(ReactAndroid REQUIRED CONFIG)
add_library(jsi ALIAS ReactAndroid::jsi)
add_library(reactnative ALIAS ReactAndroid::reactnative)

find_package(fbjni REQUIRED CONFIG)
add_library(fbjni ALIAS fbjni::fbjni)

target_link_libraries(${CMAKE_PROJECT_NAME}
  fbjni
  jsi
  reactnative
)

add_library(common_flags INTERFACE)
target_compile_options(common_flags INTERFACE ${folly_FLAGS})

if(EXISTS ${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)
  include(${PROJECT_BUILD_DIR}/generated/autolinking/src/main/jni/Android-autolinking.cmake)
  target_link_libraries(${CMAKE_PROJECT_NAME} ${AUTOLINKED_LIBRARIES})
  foreach(autolinked_library ${AUTOLINKED_LIBRARIES})
    target_link_libraries(${autolinked_library} common_flags)
  endforeach()
endif()

if(EXISTS ${PROJECT_BUILD_DIR}/generated/source/codegen/jni/CMakeLists.txt)
  add_subdirectory(${PROJECT_BUILD_DIR}/generated/source/codegen/jni/ codegen_app_build)
  get_property(APP_CODEGEN_TARGET DIRECTORY ${PROJECT_BUILD_DIR}/generated/source/codegen/jni/ PROPERTY BUILDSYSTEM_TARGETS)
  target_link_libraries(${CMAKE_PROJECT_NAME} ${APP_CODEGEN_TARGET})
  target_link_libraries(${APP_CODEGEN_TARGET} common_flags)

  string(REGEX REPLACE "react_codegen_" "" APP_CODEGEN_HEADER "${APP_CODEGEN_TARGET}")
  target_compile_options(${CMAKE_PROJECT_NAME}
    PRIVATE
    -DREACT_NATIVE_APP_CODEGEN_HEADER="${APP_CODEGEN_HEADER}.h"
    -DREACT_NATIVE_APP_COMPONENT_DESCRIPTORS_HEADER="react/renderer/components/${APP_CODEGEN_HEADER}/ComponentDescriptors.h"
    -DREACT_NATIVE_APP_COMPONENT_REGISTRATION=${APP_CODEGEN_HEADER}_registerComponentDescriptorsFromCodegen
    -DREACT_NATIVE_APP_MODULE_PROVIDER=${APP_CODEGEN_HEADER}_ModuleProvider
  )
endif()

set(REACTNATIVE_MERGED_SO true)
