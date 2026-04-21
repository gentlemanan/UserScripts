// ==UserScript==
// @name Chronos Seek
// @namespace http://tampermonkey.net/
// @version 14.7
// @description An advanced video navigation utility that intercepts page video players to provide a high-fidelity thumbnail grid.Extract frames at variable intervals and zoom into specific scenes for precision seeking.
// @author Anon
// @match *://*/*
// @grant none
// ==/UserScript==

(function () {
    'use strict';

    const thumbCache = new Map();
    const state = {
        currentInterval: 0,
        video: null,
        extracting: false,
        ui: {}
    };

    const el = (tag, props = {}, style = {}) => {
        const res = Object.assign(document.createElement(tag), props);
        if (Object.keys(style).length) Object.assign(res.style, style);
        return res;
    };

    const launcher = el('div', { className: 'vam-launcher' }, {
        position: 'fixed', bottom: '16px', right: '16px', zIndex: '9999999',
        fontFamily: 'system-ui, sans-serif', display: 'none', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'
    });

    const videoList = el('div', {}, {
        background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px',
        padding: '4px', display: 'none', flexDirection: 'column', gap: '2px',
        maxHeight: '200px', overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', width: '180px'
    });

    const initBtn = el('button', { textContent: 'Launch VAM' }, {
        padding: '6px 12px', background: '#1e90ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer',
        fontSize: '12px'
    });

    launcher.append(videoList, initBtn);
    document.body.appendChild(launcher);

    launcher.onmouseenter = () => { videoList.style.display = 'flex'; };
    launcher.onmouseleave = () => { videoList.style.display = 'none'; };

    setInterval(() => {
        const videos = Array.from(document.querySelectorAll('video'))
            .filter(v => v.duration > 10 && v.readyState > 0 && !v.dataset.vamManaged);

        if (!videos.length) return;

        launcher.style.display = 'flex';
        videoList.style.width = '240px'; // Slightly wider for more info
        videoList.replaceChildren();

        videos.forEach((v, i) => {
            // Extract filename from src or use generic title
            const src = v.currentSrc || v.src;
            const fileName = src ? src.split('/').pop().split('?')[0] : 'Unknown Source';
            const shortName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;

            // Format duration
            const hrs = Math.floor(v.duration / 3600);
            const mins = Math.floor((v.duration % 3600) / 60);
            const secs = Math.floor(v.duration % 60);
            const timeStr = hrs > 0
                ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                : `${mins}:${secs.toString().padStart(2, '0')}`;

            const infoLine = el('div', {}, {
                padding: '6px',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            });

            const title = el('div', {
                textContent: `[${i + 1}] ${shortName}`,
                title: fileName // Hover to see full name
            }, {
                fontWeight: 'bold', fontSize: '11px', color: '#333', overflow: 'hidden', whiteSpace: 'nowrap'
            });

            const meta = el('div', {
                textContent: `${v.videoWidth}x${v.videoHeight} • ${timeStr}`
            }, {
                fontSize: '10px', color: '#888'
            });

            infoLine.append(title, meta);
            infoLine.onclick = () => launchTakeover(v);

            // Hover effect
            infoLine.onmouseenter = () => { infoLine.style.background = '#eef'; };
            infoLine.onmouseleave = () => { infoLine.style.background = 'none'; };

            videoList.appendChild(infoLine);
        });
    }, 3000);

    function launchTakeover(v) {
        thumbCache.clear(); // Clean up memory from previous video
        state.video = v;
        v.dataset.vamManaged = "true";
        state.currentInterval = v.duration / 12;

        document.documentElement.innerHTML = `

<head>
    <style>
        body {
            margin: 0;
            background: #000;
            color: #ccc;
            font-family: system-ui;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .main {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .tray {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 160px;
            background: #1e1e1e;
            border-bottom: 1px solid #333;
            display: flex;
            flex-direction: column;
            opacity: 0;
            transition: 0.2s;
            z-index: 100;
        }

        .tray:hover {
            opacity: 1;
        }

        .ctrl {
            height: 30px;
            padding: 0 10px;
            background: #2d2d2d;
            display: flex;
            gap: 10px;
            align-items: center;
            font-size: 11px;
            border-bottom: 1px solid #333;
        }

        .grid-container {
            flex: 1;
            overflow-x: auto;
            position: relative;
            background: #111;
            scroll-behavior: smooth;
        }

        .grid {
            display: flex;
            gap: 2px;
            padding: 5px;
            min-width: max-content;
            height: calc(100% - 10px);
        }

        .cell {
            flex: 0 0 180px;
            height: 100%;
            background: #000;
            border: 1px solid #333;
            position: relative;
            cursor: pointer;
            box-sizing: border-box;
        }

        .cell.active {
            border-color: gold;
            outline: 1px solid gold;
        }

        .cell img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
        }

        .cell span {
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 1px 4px;
            pointer-events: none;
        }

        #playhead {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: gold;
            box-shadow: 0 0 5px gold;
            pointer-events: none;
            z-index: 10;
            transform-origin: left;
            will-change: transform;
        }

        .btn {
            background: #3c3c3c;
            color: #fff;
            border: none;
            padding: 3px 8px;
            cursor: pointer;
            border-radius: 2px;
            font-size: 10px;
        }

        .btn:disabled {
            opacity: 0.3;
            cursor: default;
        }

        video {
            max-width: 100%;
            max-height: 100%;
        }
    </style>
</head>

<body>
    <div class="main" id="player-mount"></div>
    <div class="tray">
        <div class="ctrl">
            <b style="color:#fff">VAM</b>
            <button class="btn" id="z-out">Zoom Out</button>
            <button class="btn" id="z-in">Zoom In</button>
            <span id="status" style="margin-left: auto; color: gray"></span>
        </div>
        <div class="grid-container" id="grid-cont">
            <div class="grid" id="grid"></div>
            <div id="playhead"></div>
        </div>
    </div>
</body>`;

        state.ui = {
            mount: document.getElementById('player-mount'),
            grid: document.getElementById('grid'),
            gridCont: document.getElementById('grid-cont'),
            status: document.getElementById('status'),
            playhead: document.getElementById('playhead'),
            btns: document.querySelectorAll('.btn')
        };

        v.controls = true;
        state.ui.mount.appendChild(v);

        document.getElementById('z-in').onclick = () => { state.currentInterval /= 2; updateTimeline(); };
        document.getElementById('z-out').onclick = () => { state.currentInterval *= 2; updateTimeline(); };

        state.ui.gridCont.onwheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                state.ui.gridCont.scrollLeft += e.deltaY;
            }
        };

        state.ui.grid.onclick = (e) => {
            const rect = state.ui.grid.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / state.ui.grid.scrollWidth;
            v.currentTime = percentage * v.duration;
            v.play();
        };

        const centerTimeline = () => {
            if (state.extracting) return;
            const percentage = v.currentTime / v.duration;
            const playheadPos = percentage * state.ui.grid.scrollWidth;
            const containerWidth = state.ui.gridCont.clientWidth;

            state.ui.gridCont.scrollLeft = playheadPos - (containerWidth / 2);
        };

        v.addEventListener('seeked', centerTimeline);

        v.ontimeupdate = () => {
            if (state.extracting) return;
            const percentage = v.currentTime / v.duration;
            state.ui.playhead.style.transform = `translateX(${percentage * state.ui.grid.scrollWidth}px)`;

            const idx = Math.floor(v.currentTime / state.currentInterval);
            const cells = state.ui.grid.querySelectorAll('.cell');
            cells.forEach((c, i) => c.classList.toggle('active', i === idx));
        };

        updateTimeline();
    }

    async function updateTimeline() {
        if (state.extracting) return;
        state.extracting = true;

        const { grid, status, btns, video } = { ...state.ui, video: state.video };
        const originalTime = video.currentTime;

        btns.forEach(b => b.disabled = true);
        const total = Math.floor(video.duration / state.currentInterval);

        grid.replaceChildren();

        const cells = [];
        const frag = document.createDocumentFragment();

        for (let i = 0; i < total; i++) {
            const time = i * state.currentInterval; const timestamp = `${Math.floor(time /
                60)}:${Math.floor(time % 60).toString().padStart(2, '0')}`; const c = el('div', {
                    className: 'cell', innerHTML:
                        `<span>${timestamp}</span>`
                });
            frag.appendChild(c);
            cells.push({ el: c, time });
        }
        grid.appendChild(frag);

        const canvas = el('canvas', { width: 320, height: 180 });
        const ctx = canvas.getContext('2d');

        for (const [index, item] of cells.entries()) {
            let src = thumbCache.get(item.time);

            if (!src) {
                status.textContent = `Capturing ${index + 1}/${total}`;
                video.currentTime = item.time;

                await new Promise(resolve => {
                    const timeout = setTimeout(resolve, 1000); // Prevent infinite hang
                    const onSeeked = () => {
                        clearTimeout(timeout);
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                try {
                    ctx.drawImage(video, 0, 0, 320, 180);
                    src = canvas.toDataURL('image/jpeg', 0.6);
                    thumbCache.set(item.time, src);
                } catch (e) {
                    src = ''; // Fallback for CORS or decode errors
                }
            }

            if (src) {
                const img = new Image();
                img.src = src;
                item.el.prepend(img);
            }
        }

        video.currentTime = originalTime;
        status.textContent = `${total} FRAMES`;
        btns.forEach(b => b.disabled = false);
        state.extracting = false;
    }
})();
