import { FILE_CATEGORY_MAP } from '../constants'
import type { FileExtension, FileValidationConfig } from '../types'

export const isFileExtensionAllowed = (filename: string, config: FileValidationConfig) => {
  const extension = filename.split('.').pop()?.toLowerCase()

  if (!extension) return false

  // ?? category =:
  const allCategoryExtensions: FileExtension[] = []

  if (config.category) {
    if (Array.isArray(config.category) && config.category.length > 0) {
      config.category.forEach((category) => {
        allCategoryExtensions.push(...FILE_CATEGORY_MAP[category])
      })
    }
    if (!Array.isArray(config.category)) {
      allCategoryExtensions.push(...FILE_CATEGORY_MAP[config.category])
    }
  }

  const allowedExtensions: readonly FileExtension[] =
    config.allowedExtensions ?? (config?.category ? allCategoryExtensions : [])

  if (!allowedExtensions.length) {
    throw new Error('File filter config is invalid: no extensions defined')
  }

  return allowedExtensions.includes(extension as FileExtension)
}
