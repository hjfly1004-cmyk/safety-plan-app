// 인터넷이 없어도 앱이 열리게 한다.
// 위기 때 신호가 안 잡히는 곳에 있을 수 있고, 그때 빈 화면이 뜨면 안 된다.
//
// 적어둔 내용은 원래 휴대폰 안(localStorage)에만 있다.
// 여기서 내보내거나 받아오는 것은 없다.
//
// 아이콘처럼 캐시부터 보는 파일을 바꾸면 이 번호를 올려야 한다.
// 올리지 않으면 이미 설치한 사람은 옛 파일을 계속 쓴다.
const CACHE = 'safety-plan-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  const isPage = req.mode === 'navigate'
    || (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  if (isPage) {
    // 앱 본문은 새 것을 먼저 찾는다. 전화번호가 바뀌었는데
    // 옛 판에 갇혀 안 걸리는 번호를 보여주는 일이 없어야 한다.
    // 인터넷이 없으면 마지막으로 받아둔 것을 쓴다.
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // 아이콘 같은 것은 캐시부터
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
