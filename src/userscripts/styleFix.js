const targetNode = document.querySelector("#navigation");

const config = { childList: true, subtree: true };

const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            const element = document.querySelector("#navigation > div.navigation__native-cta");
            if (element) {
                element.style.display = "none";
            }
        }
    }
};

const observer = new MutationObserver(callback);

observer.observe(targetNode, config);