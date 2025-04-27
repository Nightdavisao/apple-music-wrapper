(function() {
    const SVG_NS = "http://www.w3.org/2000/svg";
  
    function createSVG(paths, viewBox) {
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("width", "18");
      svg.setAttribute("height", "18");
      svg.setAttribute("viewBox", viewBox)
      paths.forEach(pathD => {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", pathD);
        svg.appendChild(path);
      })
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
      container.style.gap = '10px'
      //container.style.paddingTop = '5px'
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
      const burgerMenuBtn = createButton(
        [
          'M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z',
          'M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z',
          'M21 12C21 13.1046 20.1046 14 19 14C17.8954 14 17 13.1046 17 12C17 10.8954 17.8954 10 19 10C20.1046 10 21 10.8954 21 12Z'
        ],
        '0 0 24 24'
      )
      burgerMenuBtn.style.paddingTop = '2px'
      burgerMenuBtn.addEventListener('click', () => window.AMWrapper.openBurgerMenu())
      const backBtn = createButton(
        ['M31.7 239l136-136c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9L127.9 256l96.4 96.4c9.4 9.4 9.4 24.6 0 33.9L201.7 409c-9.4 9.4-24.6 9.4-33.9 0l-136-136c-9.5-9.4-9.5-24.6-.1-34z'],
        "-128 0 512 512"
      )
      backBtn.style.paddingTop = '2px'
      backBtn.addEventListener('click', () => window.history.back());
      // const forwardBtn = createButton(
      //   ['M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z'],
      //   '-128 0 512 512'
      // )
      // forwardBtn.addEventListener('click', () => window.history.forward())

      //container.appendChild(backBtn);
      container.appendChild(burgerMenuBtn)
      //container.appendChild(forwardBtn)
      logoHeader.prepend(backBtn)
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