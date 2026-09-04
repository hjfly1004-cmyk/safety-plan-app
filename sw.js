// 인터넷이 없어도 앱이 열리게 한다.
// 위기 때 신호가 안 잡히는 곳에 있을 수 있고, 그때 빈 화면이 뜨면 안 된다.
//
// 적어둔 내용은 원래 휴대폰 안(localStorage)에만 있다.
// 여기서 내보내거나 받아오는 것은 없다.
//
// 아이콘처럼 캐시부터 보는 파일을 바꾸면 이 번호를 올려야 한다.
// 올리지 않으면 이미 설치한 사람은 옛 파일을 계속 쓴다.
const CACHE = 'safety-plan-v3';

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
      // cache:'reload' 를 붙여서 브라우저가 따로 갖고 있는 사본을 건너뛴다.
      // 안 붙이면 방금 바꾼 파일 대신 옛 사본을 그대로 캐시에 담을 수 있다.
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
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
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isPage = req.mode === 'navigate'
    || (req.headers.get('accept') || '').indexOf('text/html') >= 0;

  // manifest에는 홈 화면에 뜰 이름과 아이콘 목록이 들어 있다.
  // 이것까지 캐시부터 보게 두면, 이름을 바꿔도 브라우저가 옛 이름을 받아 간다.
  // 실제로 '새싹'을 '반디'로 바꾼 뒤 옛 이름 그대로 설치되는 일이 있었다.
  const isManifest = url.pathname.indexOf('/manifest.json') >= 0;

  if (isPage || isManifest) {
    // 새 것을 먼저 찾는다. 전화번호가 바뀌었는데 옛 판에 갇혀
    // 안 걸리는 번호를 보여주는 일이 없어야 한다.
    // 인터넷이 없으면 마지막으로 받아둔 것을 쓴다.
    const key = isManifest ? './manifest.json' : './index.html';
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
          return res;
        })
        .catch(() => caches.match(key)
          .then(r => r || (isManifest ? null : caches.match('./')))
          .then(r => r || Response.error()))
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
