(async () => {
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const formatNumber = (value) => Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const ago = (date) => {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (seconds < 60) return `${seconds}초 전`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
    return `${Math.floor(seconds / 86400)}일 전`;
  };
  const showToast = (message) => {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2300);
  };

  async function loadMarket() {
    try {
      const response = await fetch('/api/market');
      if (!response.ok) throw new Error();
      const { quotes, updatedAt } = await response.json();
      const quoteMap = Object.fromEntries(quotes.map((quote) => [quote.symbol, quote]));
      const tickerSymbols = ['^KS11', '^KQ11', '^IXIC', 'KRW=X'];
      document.querySelectorAll('.ticker').forEach((ticker, index) => {
        const quote = quoteMap[tickerSymbols[index]];
        if (!quote || quote.price == null) return;
        ticker.querySelector('strong').textContent = formatNumber(quote.price);
        const change = ticker.querySelector('em');
        const percent = Number(quote.changePercent || 0);
        change.textContent = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
        change.className = percent >= 0 ? 'up' : 'down';
      });
      const stocks = ['005930.KS', '000660.KS', 'TSLA', 'NVDA', '005380.KS'];
      $('#rankingList').innerHTML = stocks.map((symbol, index) => {
        const quote = quoteMap[symbol] || { name: symbol, changePercent: 0 };
        const percent = Number(quote.changePercent || 0);
        return `<li><b>${index + 1}</b><div><strong>${escapeHtml(quote.name)}</strong><span>${escapeHtml(symbol.replace('.KS', ''))}</span></div><em class="${percent >= 0 ? 'up' : 'down'}">${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%</em></li>`;
      }).join('');
      const time = new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      $('#marketStatus').textContent = `${time} 기준 · 지연 시세`;
      $('#rankingTime').textContent = `${time} 기준`;
    } catch {
      $('#marketStatus').textContent = '시황 연결 대기 중';
      $('#marketStatus').classList.add('service-error');
    }
  }
  loadMarket();
  window.setInterval(loadMarket, 60000);

  let config;
  try {
    config = await fetch('/api/config', { cache: 'no-store' }).then((response) => response.json());
  } catch {
    config = {};
  }
  if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) {
    $('#chatStatus').textContent = 'DB 연결 전 예시 화면입니다.';
    return;
  }

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    session = result.data.session;
    if (result.error) {
      $('#chatStatus').textContent = '로그인 연결에 실패했습니다.';
      return;
    }
  }
  window.BRM_BACKEND_READY = true;
  $('#chatStatus').innerHTML = '<span class="connection-badge">실시간 서버 연결됨</span>';
  const savedNickname = localStorage.getItem('brm_nickname') || `개미${session.user.id.slice(0, 4)}`;
  $('#postNickname').value = savedNickname;

  const categoryLabel = { domestic: '국내', usa: '미국', free: '자유', meme: '웃짤' };
  const categoryClass = { domestic: 'domestic', usa: 'usa', free: 'free', meme: 'hot' };
  let selectedCategory = 'all';
  let posts = [];
  const renderPosts = () => {
    const filtered = selectedCategory === 'all' ? posts : posts.filter((post) => post.category === selectedCategory);
    $('#postList').innerHTML = filtered.length ? filtered.map((post) => `<article class="post is-live" data-category="${post.category}"><span class="badge ${categoryClass[post.category] || 'free'}">${categoryLabel[post.category] || '자유'}</span><div class="post-main"><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.content)}</p><div class="meta"><span>${escapeHtml(post.nickname)}</span><span>${ago(post.created_at)}</span><span>조회 ${formatNumber(post.views)}</span></div></div><div class="post-stats"><strong>0</strong><span>댓글</span></div></article>`).join('') : '<div class="empty-posts">첫 글을 작성해보세요.</div>';
  };
  const loadPosts = async () => {
    const { data, error } = await client.from('posts').select('*').order('created_at', { ascending: false }).limit(30);
    if (!error) { posts = data; renderPosts(); }
  };
  await loadPosts();
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => { selectedCategory = tab.dataset.filter; renderPosts(); }));

  const writeModal = $('#writeModal');
  $('#writeButton').addEventListener('click', () => writeModal.classList.add('open'));
  $('#writeClose').addEventListener('click', () => writeModal.classList.remove('open'));
  writeModal.addEventListener('click', (event) => { if (event.target === writeModal) writeModal.classList.remove('open'); });
  $('#postForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nickname = $('#postNickname').value.trim();
    localStorage.setItem('brm_nickname', nickname);
    const { error } = await client.from('posts').insert({ author_id: session.user.id, nickname, category: $('#postCategory').value, title: $('#postTitle').value.trim(), content: $('#postContent').value.trim() });
    if (error) return showToast('게시글 저장에 실패했습니다.');
    event.target.reset(); $('#postNickname').value = nickname; writeModal.classList.remove('open'); showToast('게시글이 등록됐습니다.');
  });

  const renderMessage = (message, prepend = false) => {
    const element = document.createElement('div');
    element.className = 'chat-message';
    element.innerHTML = `<span class="avatar avatar-red">${escapeHtml(message.nickname.slice(0, 1))}</span><p><b>${escapeHtml(message.nickname)}</b>${escapeHtml(message.content)}</p><time>${new Date(message.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time>`;
    prepend ? $('#chatMessages').prepend(element) : $('#chatMessages').append(element);
    $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
  };
  const { data: messages } = await client.from('messages').select('*').order('created_at', { ascending: false }).limit(30);
  $('#chatMessages').innerHTML = '';
  (messages || []).reverse().forEach((message) => renderMessage(message));
  $('#chatForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('#chatInput');
    const content = input.value.trim();
    if (!content) return;
    const nickname = localStorage.getItem('brm_nickname') || savedNickname;
    const { error } = await client.from('messages').insert({ author_id: session.user.id, nickname, content });
    if (error) showToast('채팅 전송에 실패했습니다.'); else input.value = '';
  });
  const liveChannel = client.channel('brm-live', {
    config: { presence: { key: session.user.id } }
  });
  liveChannel
    .on('presence', { event: 'sync' }, () => {
      $('#onlineCount').textContent = Math.max(1, Object.keys(liveChannel.presenceState()).length);
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => renderMessage(payload.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
      posts.unshift(payload.new);
      renderPosts();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await liveChannel.track({ online_at: new Date().toISOString() });
    });
})();
