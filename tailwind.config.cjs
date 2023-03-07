/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'black-square': '#7D955D',
				'white-square': '#EEEED5'
			}
		}
	},
	plugins: [require('daisyui')]
};
