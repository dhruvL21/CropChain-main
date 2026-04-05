
import { CROP_TYPES } from '@/lib/crop-data';

export const getCropDisplayName = (cropName: string, t: (key: string, values?: Record<string, string | number>) => string) => {
    if (!cropName) return cropName;
    const keyName = cropName.toLowerCase().trim();

    // Try for a direct match first
    const directTranslationKey = `crops.${keyName}`;
    const directTranslation = t(directTranslationKey);
    if (directTranslation !== directTranslationKey) {
        return directTranslation;
    }

    // Then try for a partial match from the predefined list
    const foundCrop = CROP_TYPES.find(c => keyName.includes(c.key));
    if (foundCrop) {
        const partialTranslationKey = `crops.${foundCrop.key}`;
        const partialTranslation = t(partialTranslationKey);
        if (partialTranslation !== partialTranslationKey) {
            return partialTranslation;
        }
    }
    
    // Fallback to the original name if no translation is found
    return cropName;
};
