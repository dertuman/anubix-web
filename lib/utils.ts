import { URLSearchParams } from 'url';
import imageCompression from 'browser-image-compression';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const randomUppercaseString = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
/**
 * Compresses multiple image files.
 * @param fileInputEvent - The event object from file input.
 * @param callback - A function to handle the results.
 * @returns A promise that resolves when the compression is done.
 */
export function compressImages(
  fileInputEvent: React.ChangeEvent<HTMLInputElement>,
  // eslint-disable-next-line no-unused-vars
  callback: (results: { imagePreview: string; compressedImage: File }[]) => void
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const files = fileInputEvent.target.files;
    if (!files || files.length === 0) {
      console.error('No files selected for compression');
      return reject('No files selected for compression');
    }

    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    const compressionPromises = Array.from(files).map(async (file) => {
      try {
        const compressedFile = await imageCompression(file, options);
        const reader = new FileReader();
        return new Promise<{ imagePreview: string; compressedImage: File }>(
          (resolve, reject) => {
            reader.onloadend = () => {
              const imagePreview = reader.result as string;
              resolve({ imagePreview, compressedImage: compressedFile });
            };
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
          }
        );
      } catch (error) {
        console.error('Image compression error:', error);
        throw error;
      }
    });

    try {
      const results = await Promise.all(compressionPromises);
      callback(results);
      resolve();
    } catch (error) {
      console.error('Failed to compress one or more images:', error);
      reject(error);
    }
  });
}

/**
 * Compresses an image file.
 * @param e - The event object.
 * @returns { imagePreview, compressedImage } The compressed image and its preview.
 */
export async function compressImage(fileInputEvent: any, callback: any) {
  const file = fileInputEvent.target.files[0];
  if (!file) {
    console.error('No file selected for compression');
    return;
  }

  // Image compression options
  const options = {
    maxSizeMB: 0.5, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Compressed file's maximum dimension in pixels
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    const reader = new FileReader();
    reader.onloadend = () => {
      const imagePreview = reader.result as string;
      // Callback or further processing with the compressed file and preview
      callback({
        imagePreview,
        compressedImage: compressedFile,
      });
    };
    reader.readAsDataURL(compressedFile);
  } catch (error) {
    console.error('Image compression error:', error);
  }
}

export const getActiveFiltersCount = (
  searchParams: URLSearchParams
): number => {
  const filteredParamsCount = Array.from(searchParams.entries()).filter(
    ([key]) => key !== 'id' && key !== 'page' && key !== 'limit'
  ).length;
  return filteredParamsCount;
};

export const getRandomAnimalEmoji = () => {
  const animals = [
    '🐬',
    '🦜',
    '🦢',
    '🦦',
    '🦥',
    '🦧',
    '🦨',
    '🦩',
    '🦪',
    '🦫',
    '😃',
  ];
  return animals[Math.floor(Math.random() * animals.length)];
};

export const preferencesTranslationMessages: { [key: string]: string } = {
  en: 'Language preferences updated',
  es: 'Preferencias de idioma actualizadas',
  de: 'Spracheinstellungen aktualisiert',
  fr: 'Préférences linguistiques mises à jour',
};

export const getPreferencesTranslation = (locale: string) => {
  return (
    preferencesTranslationMessages[locale] ||
    preferencesTranslationMessages['en']
  );
};

export const loginTranslationMessages: { [key: string]: string } = {
  en: 'Logged in successfully',
  es: 'Sesión iniciada con éxito',
  de: 'Erfolgreich eingeloggt',
  fr: 'Connexion réussie',
};

export const getLoginTranslation = (locale: string) => {
  return loginTranslationMessages[locale] || loginTranslationMessages['en'];
};
