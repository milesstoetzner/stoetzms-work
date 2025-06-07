import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'work.stoetz.ms',
    description: 'A simple utility for tracking working hours.',
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
            {text: 'User Guide', link: '/user-guide'},
            {text: 'Development', link: '/development'},
        ],

        socialLinks: [{icon: 'github', link: 'https://github.com/milesstoetzner/stoetzms-work'}],
    },
    appearance: false,
})
