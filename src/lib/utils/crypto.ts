import CryptoJS from 'crypto-js';

const CRYPTO_SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPT_DECRYPT_SECRET_KEY || '';

export const useCrypto = () => {
  const encodeData = (data: any): Promise<{ success: boolean; data: string | null }> => {
    return new Promise((resolve) => {
      try {
        if (!CRYPTO_SECRET_KEY) {
          console.error('CRYPTO_SECRET_KEY is not set');
          return resolve({
            success: false,
            data: null,
          });
        }

        const stringifyData = JSON.stringify(data);
        const encryptedData = CryptoJS.AES.encrypt(stringifyData, CRYPTO_SECRET_KEY).toString();

        return resolve({
          success: true,
          data: encryptedData,
        });
      } catch (err) {
        console.error('Encryption Error :- ', err);
        return resolve({
          success: false,
          data: null,
        });
      }
    });
  };

  const decodeData = (encodedData: string): Promise<{ success: boolean; data: any }> => {
    return new Promise((resolve) => {
      try {
        if (!CRYPTO_SECRET_KEY) {
          console.error('CRYPTO_SECRET_KEY is not set');
          return resolve({
            success: false,
            data: null,
          });
        }

        const decryptedBytes = CryptoJS.AES.decrypt(encodedData, CRYPTO_SECRET_KEY);
        const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
          console.error('Error To Get Decrypted String...');
          return resolve({
            success: false,
            data: null,
          });
        }

        const decodedData = JSON.parse(decryptedString);
        return resolve({
          success: true,
          data: decodedData,
        });
      } catch (err) {
        console.error('Decryption Error :- ', err);
        return resolve({
          success: false,
          data: null,
        });
      }
    });
  };

  return { encodeData, decodeData };
};

