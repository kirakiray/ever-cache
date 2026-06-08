import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/main.min.js',
    format: 'es',
    sourcemap: true,
    banner: `/* ever-cache v${pkg.version} */`
  },
  plugins: [
    terser({
      format: {
        comments: function(node, comment) {
          return comment.value.includes('ever-cache');
        }
      }
    })
  ]
};