// ==UserScript==
// @name        Force Video.js Player (VR Supported)
// @namespace   ForceVideoJS
// @version     1.7
// @description Forces any HTML5 videos to open in a fullscreen Video.js player. Supports 180° VR videos and includes keyboard shortcuts for playback control.
// @author      anon
// @license     MIT
// @match       *://*/*
// @grant       none
// @downloadURL https://update.greasyfork.org/scripts/574781/Force%20Videojs%20Player%20%28VR%20Supported%29.user.js
// @updateURL https://update.greasyfork.org/scripts/574781/Force%20Videojs%20Player%20%28VR%20Supported%29.meta.js
// ==/UserScript==

(function () {
    // Base Assets
    const link = document.head.appendChild(document.createElement('link'));
    link.rel = 'stylesheet';
    link.href = 'https://vjs.zencdn.net/8.10.0/video-js.css';

    const script = document.head.appendChild(document.createElement('script'));
    script.src = 'https://vjs.zencdn.net/8.10.0/video.min.js';

    // VR Plugin
    const vrScript = document.createElement('script');
    vrScript.src = 'https://cdn.jsdelivr.net/npm/@blaineam/videojs-vr@3.1.4/dist/videojs-vr.js';
    document.head.appendChild(vrScript);

    // Theme Assets
    const themeStyle = document.createElement('link');
    themeStyle.rel = 'stylesheet';
    themeStyle.href = 'https://cdn.jsdelivr.net/npm/videojs-theme-kit@0.0.15/style.min.css';

    const themeScript = document.createElement('script');
    themeScript.src = 'https://cdn.jsdelivr.net/npm/videojs-theme-kit@0.0.15/videojs-skin.min.js';

    const box = document.body.appendChild(document.createElement('div'));
    const list = box.appendChild(document.createElement('div'));
    const btn = box.appendChild(document.createElement('button'));

    Object.assign(box.style, { position: 'fixed', bottom: '16px', right: '16px', zIndex: 9e7, background: '#fff', border: '1px solid #ccc', padding: '4px', display: 'none', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'sans-serif' });
    Object.assign(list.style, { display: 'none', width: '240px', maxHeight: '200px', overflowY: 'auto' });
    btn.textContent = 'Launch Video';

    box.onmouseenter = () => list.style.display = 'flex';
    box.onmouseleave = () => list.style.display = 'none';

    setInterval(() => {
        const vids = [...document.querySelectorAll('video')].filter(v => v.duration > 1 && !v.dataset.v);
        if (!vids.length) return;

        box.style.display = 'flex';
        vids.forEach((v) => {
            v.dataset.v = 1;
            const item = list.appendChild(document.createElement('div'));
            const name = (v.currentSrc || v.src).split('/').pop().split('?')[0].slice(0, 20) || 'Untitled Video';
            item.innerHTML = `<div style="font-weight:bold;font-size:11px">${name}</div>
                              <div style="font-size:10px">${v.videoWidth}x${v.videoHeight} • ${~~(v.duration / 60)}:${(~~(v.duration % 60)).toString().padStart(2, 0)}</div>`;
            item.style.cssText = 'padding:6px;border-bottom:1px solid #eee;cursor:pointer';

            item.onclick = () => {
                if (typeof videojs === 'undefined') {
                    alert('Video.js is still loading...');
                    return;
                }

                const currentTime = v.currentTime;

                // Reset DOM
                document.body.innerHTML = '';
                document.head.innerHTML = '';

                // Re-append Core, VR, and Theme assets
                document.head.appendChild(link);
                document.head.appendChild(vrScript);
                document.head.appendChild(themeStyle);
                document.head.appendChild(themeScript);

                document.body.style.margin = '0';
                document.body.style.overflow = 'hidden';

                const container = document.body.appendChild(document.createElement('div'));
                container.style.cssText = 'width:100vw;height:100vh;background:#000;overflow:hidden;position:relative;';

                v.className = 'video-js skin_slate';
                container.appendChild(v);

                const player = videojs(v, {
                    controls: true,
                    fill: true,
                    playbackRates: [0.5, 1, 1.5, 2],
                    userActions: { doubleClick: true },
                    controlBar: {
                        skipButtons: true,
                    },
                });
                // VR Auto-Detection (Assumes 180° if aspect ratio is 2:1)
                if (v.videoWidth / v.videoHeight == 2) {
                    player.vr({ projection: '180' });
                }
            };
        });
    }, 1000);
})();