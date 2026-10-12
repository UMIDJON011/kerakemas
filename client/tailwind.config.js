// Ranglar imtihon daftari dunyosidan olingan: kobalt (daftar muqovasi), sariq marker, ustozning qizil qalami.
// Eski klasslar (indigo, slate, rose, amber) yangi palitraga ulangan — admin sahifalari ham o'zi yangilanadi.
const cobalt = { 50: '#EDF1FD', 100: '#D9E2FB', 200: '#B5C5F6', 300: '#8CA5F0', 400: '#5F7FE8', 500: '#3A5ADE', 600: '#3350F2', 700: '#2A41C9', 800: '#14267F', 900: '#0F1D5E', 950: '#0A1348' };
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        hand: ['Caveat', 'Segoe Print', 'Bradley Hand', 'cursive'],
        serif: ['Literata', 'Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        indigo: cobalt, purple: cobalt, blue: cobalt,
        slate: { 50: '#F4F6FB', 100: '#E9EDF6', 200: '#D3DAEA', 300: '#B3BCD5', 400: '#8993B1', 500: '#5F6985', 600: '#464F6E', 700: '#323B5C', 800: '#1D2748', 900: '#121A38', 950: '#0A1128' },
        rose: { 50: '#FEF1F2', 100: '#FDE4E7', 200: '#FBC9D0', 300: '#F59AA8', 400: '#EC6277', 500: '#D4223A', 600: '#B5172D', 700: '#931327', 800: '#730F1F', 900: '#5A0B18', 950: '#3A0510' },
        amber: { 50: '#FFFBEA', 100: '#FFF4BD', 200: '#FFE97A', 300: '#FFDF4D', 400: '#FFD93D', 500: '#F0C21A', 600: '#B88F00', 700: '#8F6D00', 800: '#6B5200', 900: '#4A3900', 950: '#2B2100' },
      },
    },
  },
};
