// ==UserScript==
// @name        Force Simple Player
// @namespace   https://greasyfork.org/users/simple-player
// @version     1.3
// @description Bypasses ad-filled video sites by extracting the video element and launching it in a clean, standalone player.
// @author      anon
// @license     MIT
// @match       *://*/*
// @grant       none
// ==/UserScript==
 
(function () {
    const box = document.body.appendChild(document.createElement('div'));
    const list = box.appendChild(document.createElement('div'));
    const btn = box.appendChild(document.createElement('button'));
 
    Object.assign(box.style, { position: 'fixed', bottom: '16px', right: '16px', zIndex: 9e7, background: '#fff', border: '1px solid #ccc', padding: '4px', display: 'none', flexDirection: 'column', alignItems: 'flex-end' });
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
            const name = (v.currentSrc || v.src).split('/').pop().split('?')[0].slice(0, 20);
            item.innerHTML = `<div style="font-weight:bold;font-size:11px">${name}</div>
                              <div style="font-size:10px">${v.videoWidth}x${v.videoHeight} • ${~~(v.duration / 60)}:${(~~(v.duration % 60)).toString().padStart(2, 0)}</div>`;
            item.style.cssText = 'padding:6px;border-bottom:1px solid #eee;cursor:pointer';
            item.onclick = () => {
                document.documentElement.innerHTML = '';
                v.controls = 1;
                Object.assign(v.style, { maxWidth: '100vw', maxHeight: '100vh' });
                document.body.appendChild(v);
                v.play();
            };
        });
    }, 1000);
})();
