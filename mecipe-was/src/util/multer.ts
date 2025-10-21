import { randomBytes, randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import * as multer from 'multer';

function getExtension(mime: string): string {
  // image/gif, image/png, image/jpeg, image/bmp, image/webp
  if (mime.match('image/')) {
    const ext = mime.replace('image/', '.');
    return ext;
  } else {
    return '';
  }
}

export const getStorage = (dest: string) =>
  multer.diskStorage({
    destination: function (req, file, callback) {
      if (!existsSync(dest)) {
        mkdirSync(dest);
      }
      callback(null, dest);
    },
    filename: function (req, file, callback) {
      callback(
        null,
        file.fieldname +
        '-' +
        Date.now() +
        '-' +
        randomBytes(2).toString('hex') +
        getExtension(file.mimetype),
      );
    },
  });

export const getStorageVariant = () =>
  multer.diskStorage({
    destination: function (req, file, callback) {
      try {
        const category = typeof req.query?.category === 'string' ? req.query.category : 'image';
        const base = `./media/${category}`;
        const dest = file.fieldname === 'thumbnail' ? `${base}/thumbnail` : base;

        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
        }

        callback(null, dest);
      } catch (err) {
        console.error('Error in destination:', err);
        callback(err, '');
      }
    }
    ,
    filename: function (req, file, callback) {
      callback(
        null,
        file.fieldname +
        '-' +
        Date.now() +
        '-' +
        randomBytes(2).toString('hex') +
        getExtension(file.mimetype),
      );
    },
  });

/*export const getStorage = (dest: string) => multer.diskStorage({
  destination: function (req, file, callback) {
    callback(
      null,
      file.filename
    )
  },*/
