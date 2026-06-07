import terser from '@rollup/plugin-terser';

export default {
  input: 'src/main.js',
  output: {
    file: 'src/main.min.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    terser()
  ]
};