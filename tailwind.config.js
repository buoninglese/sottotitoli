/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./panoramica.html'],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
  corePlugins: { preflight: false }
}
