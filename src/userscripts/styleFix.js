(function() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        #navigation > div.navigation__native-cta {
            display: none;
        }
    `;
    document.head.appendChild(style);
})();