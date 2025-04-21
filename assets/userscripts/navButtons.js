(function() {
    const SVG_NS = "http://www.w3.org/2000/svg";
  
    function createSVG(pathD, viewBox) {
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", viewBox)
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pathD);
      svg.appendChild(path);
      return svg;
    }
  
    function insertBackButton() {
      const logoHeader = document.querySelector(
        "body > div > div > div.header.svelte-j9kb77 > nav > div.navigation__header.svelte-1ovc3hy > div.logo.svelte-1o7dz8w"
      );
      if (!logoHeader) return false;
      if (document.getElementById('amwrapper-buttons')) return
  
      const container = document.createElement('div');
      container.id = 'amwrapper-buttons'
      container.style.display = 'flex';
      container.style.gap = '15px'
      container.style.paddingTop = '2px'
      // container.style.padding = '10px';

      function createButton(pathD, viewBox) {
          const backBtn = document.createElement('div');
          backBtn.classList.add('amwrapper-button')
          //backBtn.style.color = "#e5e5e5"
          backBtn.style.cursor = 'pointer';
          const backSvg = createSVG(
            //'M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z',
            //"-128 0 512 512"
            pathD,
            viewBox
          );
          backBtn.appendChild(backSvg);
          return backBtn
      }

      const backBtn = createButton(
        'M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z',
        "-128 0 512 512"
      )
      backBtn.addEventListener('click', () => window.history.back());
      const forwardBtn = createButton(
        'M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z',
        '-128 0 512 512'
      )
      forwardBtn.addEventListener('click', () => window.history.forward())

      container.appendChild(backBtn);
      container.appendChild(forwardBtn)
      logoHeader.appendChild(container);
  
      return true;
    }
  
    // Observe for the logo element to be added to the DOM
    const observer = new MutationObserver((mutations, obs) => {
      if (insertBackButton()) {
        console.log('inserting back button')
        obs.disconnect();
      }
    });

    window.addEventListener('resize', () => {
        if (!document.getElementById('amwrapper-buttons')) {
            insertBackButton()
        }
    })
  
    observer.observe(document.body, { childList: true, subtree: true });
  
    // Try immediately in case it's already present
    insertBackButton();

    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        .amwrapper-button {
            color: #FFFFFFA3;
        }
        .amwrapper-button:hover {
            color: #FFFFFF
        }
    `;
    document.head.appendChild(style);
  })();