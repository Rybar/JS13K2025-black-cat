/**
 * Scan every source file for a DATAURL placeholder
 * and replace the PNG file indicated by its content
 * as a base64 encoded dataurl
 *
 * e.g. const charset = 'DATAURL:src/img/charset.png';
 * becomes
 * const charset = 'data:image/png;base64,123456badc0ffee...';
 */
import { readFileSync } from 'fs';
import { extname } from 'path';

const MIME_TYPES = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function getMimeType(imageFilePath) {
  const extension = extname(imageFilePath).toLowerCase();
  return MIME_TYPES[extension] ?? 'application/octet-stream';
}

export const dataurl = () => ({
    name: 'rollup-plugin-dataurl',

    transform: (source, id) => {
      let transformedCode = source;

      transformedCode = transformedCode.replace(/'DATAURL:([^']+)'/g, (match, imageFilePath) => {
        const data = readFileSync(`./${imageFilePath}`);
        return `'data:${getMimeType(imageFilePath)};base64,${data.toString('base64')}'`;
      });

      console.log('dataurl plugin done with', id);
      return {
        code: transformedCode,
        map: { mappings: ''}
      };
    }
  });

export default {
  dataurl
};
