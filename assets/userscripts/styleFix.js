(function() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        #navigation > div.navigation__native-cta {
            display: none;
        }
        body > div > div > div.header.svelte-12raf06 > nav > div.navigation__header.svelte-13li0vp > div.logo.svelte-z33urn {
            display: none;
        }
        body > div > div > div.header.svelte-rjjbqs > nav > div.navigation__header.svelte-13li0vp > div.logo.svelte-1o7dz8w {
            display: none;
        }
    `;
    document.head.appendChild(style);
})();