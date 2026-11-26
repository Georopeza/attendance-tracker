/** Compilar con: npx tailwindcss@3.4.17 -c frontend/tailwind.config.js -i frontend/entrada.css -o static/css/app.css --minify */
module.exports = {
  content: ["./templates/**/*.html", "./*/templates/**/*.html"],
  theme: { extend: {} },
  plugins: [],
};
