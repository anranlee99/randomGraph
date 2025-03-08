const Common = {};
const Demo = {};

Common.injectStyles = function (styles, id) {
  if (document.getElementById(id)) {
    return;
  }

  let root = document.createElement('div');
  root.innerHTML = `<style id="${id}" type="text/css">${styles}</style>`;

  let lastStyle = document.head.querySelector('style:last-of-type');

  if (lastStyle) {
    Common.domInsertBefore(root.firstElementChild, lastStyle);
  } else {
    document.head.appendChild(root.firstElementChild);
  }
};

Common.injectScript = function (url, id, callback) {
  if (document.getElementById(id)) {
    return;
  }

  let script = document.createElement('script');
  script.id = id;
  script.src = url;
  script.onload = callback;

  document.body.appendChild(script);
};

Common.domRemove = function (element) {
  return element.parentElement.removeChild(element);
};

Common.domInsertBefore = function (element, before) {
  return before.parentNode.insertBefore(element, before.previousElementSibling);
};
export function initDOM(options) {
  let styles = import('./styles.css');
  Common.injectStyles(styles, 'matter-demo-style');

  let root = document.createElement('div');

  // let exampleOptions = options.examples.map((example) => {
  //     return `<option value="${example.id}">${example.name}</option>`;
  // }).join(' ');

  var preventZoomClass = options.preventZoom && Demo._isIOS ? 'prevent-zoom-ios' : '';

  root.innerHTML = `
    <div class="matter-demo ${options.toolbar.title} ${preventZoomClass}">
      <div class="matter-header-outer">
        <header class="matter-header">
          <div class="matter-header-inner">
            <h1 class="matter-demo-title">
              <a href="${options.toolbar.url}" target="_blank">
              ${options.toolbar.title}
                <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/>
                </svg>
              </a>
            </h1>
            <div class="matter-toolbar">
              <div class="matter-select-wrapper">
                <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10l5 5 5-5z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              </div>
              <button class="matter-btn matter-btn-reset" title="Reset">
                <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              </button>
              <a href="#" class="matter-btn matter-btn-source" title="Source" target="_blank">{ }</a>
              <button class="matter-btn matter-btn-tools" title="Tools">
                <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  <path d="M0 0h24v24H0z" fill="none"/>
                </svg>
              </button>
              <button class="matter-btn matter-btn-inspect" title="Inspect">
              <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M11 4.07V2.05c-2.01.2-3.84 1-5.32 2.21L7.1 5.69c1.11-.86 2.44-1.44 3.9-1.62zm7.32.19C16.84 3.05 15.01 2.25 13 2.05v2.02c1.46.18 2.79.76 3.9 1.62l1.42-1.43zM19.93 11h2.02c-.2-2.01-1-3.84-2.21-5.32L18.31 7.1c.86 1.11 1.44 2.44 1.62 3.9zM5.69 7.1L4.26 5.68C3.05 7.16 2.25 8.99 2.05 11h2.02c.18-1.46.76-2.79 1.62-3.9zM4.07 13H2.05c.2 2.01 1 3.84 2.21 5.32l1.43-1.43c-.86-1.1-1.44-2.43-1.62-3.89zM15 12c0-1.66-1.34-3-3-3s-3 1.34-3 3 1.34 3 3 3 3-1.34 3-3zm3.31 4.9l1.43 1.43c1.21-1.48 2.01-3.32 2.21-5.32h-2.02c-.18 1.45-.76 2.78-1.62 3.89zM13 19.93v2.02c2.01-.2 3.84-1 5.32-2.21l-1.43-1.43c-1.1.86-2.43 1.44-3.89 1.62zm-7.32-.19C7.16 20.95 9 21.75 11 21.95v-2.02c-1.46-.18-2.79-.76-3.9-1.62l-1.42 1.43z"/>
              </svg>
              </button>
              <button class="matter-btn matter-btn-fullscreen" title="Fullscreen">
                <svg fill="#000000" height="22" viewBox="0 0 22 22" width="22" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0h24v24H0z" fill="none"/>
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              </button>
            </div>
            <a class="matter-link" href="${Demo._matterLink}" title="matter.js" target="_blank">
              <svg class="matter-logo" height="100" viewBox="0 952.04859 330 100" width="268" xmlns="http://www.w3.org/2000/svg">
                <path id="m-triangle" style="fill:#76f09b;" d="m 115.83215,1052.3622 -57.916072,0 -57.916078053812107,0 L 28.958038,1002.2054 57.916077,952.04859 86.874114,1002.2054 Z" />
                <path id="m-square" style="fill:#f55f5f" d="m 168.03172,952.36218 0,100.00002 100,0 0,-100.00002 -100,0 z" />
                <circle id="m-circle" style="fill:#f5b862" r="12.947398" cy="1039.4148" cx="140.28374" />
              </svg>
            </a>
          </div>
        </header>
      </div>
    </div>
  `;
  document.body.appendChild(root.firstElementChild);
  let dom = {
    root: root.firstElementChild,
    title: root.querySelector('.matter-demo-title'),
    header: root.querySelector('.matter-header'),
    exampleSelect: root.querySelector('.matter-example-select'),
    buttonReset: root.querySelector('.matter-btn-reset'),
    buttonSource: root.querySelector('.matter-btn-source'),
    buttonTools: root.querySelector('.matter-btn-tools'),
    buttonInspect: root.querySelector('.matter-btn-inspect'),
    buttonFullscreen: root.querySelector('.matter-btn-fullscreen')
  };

  if (!options.toolbar.title) {
    Common.domRemove(dom.title);
  }


  if (!options.toolbar.reset) {
    Common.domRemove(dom.buttonReset);
  }

  if (!options.toolbar.source) {
    Common.domRemove(dom.buttonSource);
  }

  if (!options.toolbar.inspector) {
    Common.domRemove(dom.buttonInspect);
  }

  if (!options.toolbar.tools) {
    Common.domRemove(dom.buttonTools);
  }

  if (!options.toolbar.fullscreen) {
    Common.domRemove(dom.buttonFullscreen);
  }


  window.addEventListener('orientationchange', function () {
    setTimeout(() => {
      if (demo.resetOnOrientation) {
        Demo.reset(demo);
      }
    }, 300);
  });

  if (options.preventZoom) {
    document.body.addEventListener('gesturestart', function (event) {
      event.preventDefault();
    });

    var allowTap = true,
      tapTimeout;

    document.body.addEventListener('touchstart', function (event) {
      if (!allowTap) {
        event.preventDefault();
      }

      allowTap = false;

      clearTimeout(tapTimeout);
      tapTimeout = setTimeout(function () {
        allowTap = true;
      }, 500);
    });
  }

  if (dom.exampleSelect) {
    dom.exampleSelect.addEventListener('change', function () {
      let exampleId = this.options[this.selectedIndex].value;
      Demo.setExampleById(demo, exampleId);
    });
  }

  if (dom.buttonReset) {
    dom.buttonReset.addEventListener('click', function () {
      Demo.reset(demo);
    });
  }

  if (dom.buttonInspect) {
    dom.buttonInspect.addEventListener('click', function () {
      var showInspector = !demo.tools.inspector;
      Demo.setInspector(demo, showInspector);
    });
  }

  if (dom.buttonTools) {
    dom.buttonTools.addEventListener('click', function () {
      var showGui = !demo.tools.gui;
      Demo.setGui(demo, showGui);
    });
  }

  if (dom.buttonFullscreen) {
    dom.buttonFullscreen.addEventListener('click', function () {
      Demo._toggleFullscreen(demo);
    });

    var fullscreenChange = function () {
      var isFullscreen = document.fullscreen || document.webkitIsFullScreen || document.mozFullScreen;
      document.body.classList.toggle('matter-is-fullscreen', isFullscreen);
    };

    document.addEventListener('webkitfullscreenchange', fullscreenChange);
    document.addEventListener('mozfullscreenchange', fullscreenChange);
    document.addEventListener('fullscreenchange', fullscreenChange);
  }
};