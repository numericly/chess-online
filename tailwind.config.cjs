/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				'black-square': '#547296',
				'white-square': '#EAE9D4',
				'black-square-highlight': '#e6e185',
				'white-square-highlight': '#e8e6b7'
			}
		}
	},
	plugins: [require('daisyui')]
};
