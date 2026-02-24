"use client"

import { useState, type CSSProperties, type ReactNode } from "react"
import Image, { type ImageProps } from "next/image"

const fallbackBlurDataUrl =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="

// Allow environment override, but keep a hardcoded fallback 
const defaultBlurDataUrl = process.env.NEXT_PUBLIC_DEFAULT_BLUR_DATA_URL ?? fallbackBlurDataUrl

const isCloudinaryImage = (src: string): boolean =>
  src.includes("res.cloudinary.com") && src.includes("/image/upload/")

const injectCloudinaryTransforms = (src: string, transforms: string): string => {
  const parts = src.split("/upload/")
  if (parts.length !== 2) return src
  return `${parts[0]}/upload/${transforms}/${parts[1]}`
}

const getOptimizedSrc = (src: string): string => {
  if (!src) return src
  if (!isCloudinaryImage(src)) return src
  return injectCloudinaryTransforms(src, "f_auto,q_auto")
}

const getBlurUrl = (src: string): string => {
  if (!src) return defaultBlurDataUrl

  if (isCloudinaryImage(src)) {
    // Inject a tiny transformed variant for smooth blur placeholders
    return injectCloudinaryTransforms(src, "w_10,e_blur:1000,q_auto,f_webp")
  }

  return defaultBlurDataUrl
}

type OptimizedStoryImageProps = {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
  style?: CSSProperties
  fallback?: ReactNode
}

export default function OptimizedStoryImage({
  src,
  alt,
  width = 800,
  height = 450,
  fill = false,
  priority = false,
  className,
  sizes,
  style,
  fallback,
}: OptimizedStoryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return fallback ?? null
  }

  const finalSrc = getOptimizedSrc(src)
  const useCloudinaryDirect = isCloudinaryImage(finalSrc)

  const imageProps: ImageProps = {
    src: finalSrc,
    alt,
    priority,
    placeholder: "blur",
    blurDataURL: getBlurUrl(finalSrc),
    unoptimized: useCloudinaryDirect,
    onLoadingComplete: () => setIsLoaded(true),
    onError: () => setHasError(true),
    className,
    sizes: sizes ?? (fill ? "100vw" : undefined),
    style: {
      ...style,
      objectFit: style?.objectFit ?? "cover",
      transition: "opacity 0.3s ease",
      opacity: isLoaded ? 1 : 0.7,
    },
  }

  if (fill) {
    return <Image {...imageProps} alt={alt} fill />
  }

  return <Image {...imageProps} alt={alt} width={width} height={height} />
}
