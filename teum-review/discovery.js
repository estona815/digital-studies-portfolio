Object.defineProperty(window,'TEUM_BUILD',{value:Object.freeze({"version":"0.6.1-free-preview","mode":"synthetic-browser-memory","realRegistration":false,"realMessaging":false,"ads":false,"payments":false,"locationTracking":false,"backend":false,"productionGo":false}),writable:false});
(()=>{function el(tag, cls = '', text = '') { const n = document.createElement(tag); if (cls)
    n.className = cls; if (text)
    n.textContent = text; return n; }
function append(n, ...children) { for (const child of children)
    if (child)
        n.append(child); return n; }
function button(text, action, cls = 'dw-button') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', () => void action()); return b; }
const newClientId = () => {
    if (typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const fmt = (value) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(value));
function field(label, input) { input.setAttribute('aria-label', label); return append(el('label', 'dw-field', label), input); }
function input(value = '', type = 'text') { const n = el('input'); n.type = type; n.value = value; return n; }
const human = (e) => { const x = e; return x.response?.data?.error?.message ?? x.message ?? '연결을 확인하고 다시 시도해 주세요.'; };
class DiscoveryWorkspace {
    root;
    options;
    alive = true;
    revision = 0;
    mode = 'FRIENDS';
    tab = 'people';
    state = null;
    cards = [];
    query = '';
    region = '';
    busy = false;
    body = el('div', 'dw-body');
    status = el('p', 'dw-announcement');
    tabs = el('nav', 'dw-tabs');
    cardBox = el('section', 'dw-card-stage');
    modal = null;
    draftByMatch = new Map();
    composing = false;
    constructor(root, options) {
        this.root = root;
        this.options = options;
        root.classList.add('dw');
        this.status.role = 'status';
        this.status.setAttribute('aria-live', 'polite');
        this.mount();
        void this.reload();
    }
    say(text) { this.status.textContent = text; this.options.toast?.(text); }
    mount() {
        const heading = append(el('header', 'dw-heading'), append(el('div'), el('span', 'dw-eyebrow', 'FIND YOUR PEOPLE'), el('h2', '', '취향이 닮은 사람')), button('필터', () => this.filters(), 'dw-filter'));
        const intro = el('p', 'dw-intro', '같은 노래에 멈추는 사람. 여기서부터 알아가자.');
        this.root.replaceChildren(heading, intro, this.tabs, this.status, this.body);
        this.renderTabs();
    }
    renderTabs() {
        this.tabs.replaceChildren();
        this.tabs.setAttribute('aria-label', '발견 메뉴');
        const menu = [['친구', 'people', 'FRIENDS']];
        if (this.state?.adult)
            menu.push(['성인 연애', 'people', 'DATE']);
        menu.push(['약속', 'plans', 'FRIENDS']);
        if (this.state?.adult)
            menu.push(['연결', 'matches', 'DATE']);
        for (const [label, tab, mode] of menu) {
            if (tab === 'matches' && !this.state?.adult)
                continue;
            const b = button(label, () => { if (this.busy)
                return; this.tab = tab; this.mode = mode; this.closeModal(); void this.reload(); });
            b.setAttribute('aria-pressed', String(this.tab === tab && (tab !== 'people' || this.mode === mode)));
            this.tabs.append(b);
        }
    }
    async perform(task, success) {
        if (this.busy)
            return null;
        this.busy = true;
        this.root.setAttribute('aria-busy', 'true');
        const rev = this.revision;
        try {
            const result = await task();
            if (!this.alive || rev !== this.revision)
                return null;
            success?.(result);
            return result;
        }
        catch (e) {
            if (this.alive && rev === this.revision)
                this.say(human(e));
            return null;
        }
        finally {
            this.busy = false;
            if (this.alive)
                this.root.removeAttribute('aria-busy');
        }
    }
    async reload() {
        if (!this.alive)
            return;
        const rev = ++this.revision;
        this.status.textContent = '불러오는 중…';
        this.body.replaceChildren(el('div', 'dw-skeleton', '잠깐, 취향을 찾고 있어.'));
        try {
            const state = await this.options.request('GET', '/api/v3/discovery/state');
            if (!this.alive || rev !== this.revision)
                return;
            this.state = state;
            this.renderTabs();
            if (this.tab === 'people') {
                if (this.mode === 'DATE' && (!state.datingOpen || !state.preference?.enabled)) {
                    this.renderOptIn();
                    this.status.textContent = '';
                    return;
                }
                const response = await this.options.request('POST', '/api/v3/discovery/query', { mode: this.mode, query: this.query, region: this.region });
                if (!this.alive || rev !== this.revision)
                    return;
                this.cards = response.items;
                this.renderCards();
            }
            else if (this.tab === 'plans') {
                await this.renderEvents(rev);
            }
            else {
                await this.renderMatches(rev);
            }
            if (this.alive && rev === this.revision)
                this.status.textContent = '';
        }
        catch (e) {
            if (this.alive && rev === this.revision) {
                this.cards = [];
                this.body.replaceChildren(append(el('div', 'dw-empty'), el('h3', '', '연결을 다시 확인해 줘.'), el('p', '', human(e)), button('다시 시도', () => this.reload())));
                this.say(human(e));
            }
        }
    }
    renderOptIn() {
        const box = append(el('section', 'dw-empty'), el('span', 'dw-symbol', '♡'), el('h3', '', '연애는, 서로 준비됐을 때.'), el('p', '', `만 ${this.state?.minimumDatingAge ?? 19}세 이상 인증 계정이 직접 켠 경우에만 보여. 친구 기능과 별도로 동의받아.`));
        if (!this.state?.datingOpen) {
            box.append(el('p', 'dw-muted', '운영 검증 전이라 아직 열리지 않았어.'));
        }
        else {
            const checkbox = input('', 'checkbox');
            box.append(field('성인 연애 기능과 상호 좋아요 매칭에 동의해요', checkbox), button('연애 기능 켜기', async () => { if (!checkbox.checked) {
                this.say('안내를 확인하고 동의해 줘.');
                return;
            } const r = await this.perform(() => this.options.request('PUT', '/api/v3/dating/preferences', { enabled: true, consentVersion: 'dating-0.5' })); if (r)
                void this.reload(); }, 'dw-primary'));
        }
        this.body.replaceChildren(box);
    }
    photoUrls = new Set();
    releasePhotos() { for (const url of this.photoUrls)
        URL.revokeObjectURL(url); this.photoUrls.clear(); }
    async loadApprovedPhoto(img, id, cardId, rev) { try {
        const result = await this.options.request('GET', `/api/v3/profile-photos/${id}/content`);
        if (!this.alive || rev !== this.revision || this.cards[0]?.id !== cardId || !img.isConnected)
            return;
        if (result.contentType !== 'image/jpeg' || result.base64.length > 700000)
            return;
        const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.base64), x => x.charCodeAt(0))], { type: 'image/jpeg' }));
        this.photoUrls.add(url);
        img.src = url;
        img.hidden = false;
    }
    catch {
        if (img.isConnected)
            img.remove();
    } }
    renderCards() {
        this.releasePhotos();
        const card = this.cards[0];
        this.body.replaceChildren();
        if (!card) {
            this.body.append(append(el('section', 'dw-empty'), el('span', 'dw-symbol', '✦'), el('h3', '', '오늘의 취향 탐색은 여기까지.'), el('p', '', '사람이 없다고 가짜 프로필을 채우지 않아. 필터를 바꾸거나 모임에서 먼저 만나봐.'), button('필터 바꾸기', () => this.filters()), button('모임에서 만나기', () => { this.options.onGroups?.(); this.tab = 'plans'; void this.reload(); })));
            return;
        }
        this.cardBox = el('section', 'dw-card-stage');
        const article = el('article', 'dw-person-card');
        article.setAttribute('aria-label', `${card.nickname}의 프로필 카드`);
        const portrait = this.options.portrait?.(card.id);
        if (card.photoId) {
            article.append(el('div', 'dw-avatar', card.nickname.slice(0, 1)));
            const img = el('img', 'dw-portrait');
            img.alt = `${card.nickname}님의 승인된 프로필 사진`;
            img.hidden = true;
            img.draggable = false;
            article.append(img);
            queueMicrotask(() => void this.loadApprovedPhoto(img, card.photoId, card.id, this.revision));
        }
        else if (portrait) {
            const img = el('img', 'dw-portrait');
            img.src = portrait;
            img.alt = '미리보기용 가상 프로필 이미지';
            img.width = 640;
            img.height = 800;
            img.draggable = false;
            article.append(img);
        }
        else
            article.append(el('div', 'dw-avatar', card.nickname.slice(0, 1)));
        article.append(el('span', 'dw-tagline', this.mode === 'DATE' ? '성인 · 상호 좋아요' : '취향 친구'));
        const detail = append(el('div', 'dw-card-info'), el('span', 'dw-match-note', `함께 좋아하는 취향 ${card.sharedInterests.length + card.sharedMusic.length}개`), el('h3', '', `${card.nickname}, ${card.age}`), el('p', 'dw-region', card.region), el('p', 'dw-bio', card.bio));
        const tags = el('div', 'dw-tags');
        card.interests.slice(0, 4).forEach(tag => tags.append(el('span', '', tag)));
        detail.append(tags);
        article.append(detail);
        const song = append(el('div', 'dw-song'), el('span', 'dw-record', '♫'), append(el('div'), el('small', '', '요즘 나누고 싶은 음악'), el('strong', '', card.music.join(' · '))));
        const actions = append(el('div', 'dw-actions'), button('✕', () => this.swipe('pass'), 'dw-pass'), button(this.mode === 'DATE' ? '♡' : '＋', () => this.swipe('like'), 'dw-connect'));
        actions.children[0].setAttribute('aria-label', '다음 사람');
        actions.children[1].setAttribute('aria-label', this.mode === 'DATE' ? '좋아요' : '대화 요청');
        const more = append(el('div', 'dw-card-footer'), button('프로필 신고', () => this.report('PROFILE', card.id), 'dw-text-button'), button('차단', () => this.block(card), 'dw-text-button'), el('small', '', '정확한 위치는 공유하지 않아.'));
        this.cardBox.append(article, song, actions, more);
        this.body.append(this.cardBox);
        if (this.mode === 'DATE')
            this.body.append(button('연애 기능 끄기', () => this.optOut(), 'dw-text-button'));
        let start = 0, tracking = false;
        article.style.touchAction = 'pan-y';
        article.addEventListener('pointerdown', e => { if (e.button !== 0)
            return; start = e.clientX; tracking = true; });
        article.addEventListener('pointerup', e => { if (!tracking)
            return; tracking = false; const delta = e.clientX - start; if (Math.abs(delta) > 90)
            void this.swipe(delta > 0 ? 'like' : 'pass'); });
        article.addEventListener('pointercancel', () => { tracking = false; });
    }
    async swipe(action) {
        const card = this.cards[0];
        if (!card || this.busy)
            return;
        if (action === 'like' && this.mode === 'FRIENDS') {
            this.contact(card);
            return;
        }
        const r = await this.perform(() => this.options.request('POST', '/api/v3/discovery/decisions', { targetId: card.id, mode: this.mode, action }));
        if (r && this.alive) {
            this.cards.shift();
            this.renderCards();
            if (r.matched)
                this.openDialog('서로의 취향이 닿았어.', dialog => { dialog.append(el('p', '', `${card.nickname}님도 좋아요를 보냈어. 이제 대화를 시작할 수 있어.`), button('연결된 대화 보기', () => { this.closeModal(); this.tab = 'matches'; void this.reload(); }, 'dw-primary')); });
            else
                this.say(action === 'pass' ? '다음 사람을 보여줄게.' : '좋아요를 보냈어. 서로 선택하면 연결돼.');
        }
    }
    contact(card) {
        this.openDialog('어디서 이야기를 시작할까?', dialog => {
            if (!card.contexts.length) {
                dialog.append(el('p', '', '함께 활동 중인 운영 확인 모임이 아직 없어. 모임에서 먼저 이야기를 나눈 뒤 대화를 요청해 줘.'), button('약속 살펴보기', () => { this.closeModal(); this.tab = 'plans'; void this.reload(); }, 'dw-primary'));
                return;
            }
            const select = el('select');
            for (const c of card.contexts) {
                const o = el('option', '', c.title);
                o.value = c.id;
                select.append(o);
            }
            const text = el('textarea');
            text.maxLength = 240;
            text.value = '같은 모임에서 음악 이야기를 나누고 싶어요.';
            dialog.append(field('함께 있는 모임', select), field('첫 인사', text), button('대화 요청 보내기', async () => { const result = await this.perform(() => this.options.request('POST', '/api/v3/contacts', { targetId: card.id, spaceId: select.value, intro: text.value })); if (result) {
                this.closeModal();
                this.say('대화 요청을 보냈어. 상대가 수락한 뒤 대화할 수 있어.');
            } }, 'dw-primary'));
        });
    }
    filters() {
        if (this.busy)
            return;
        this.openDialog('어떤 취향을 찾고 있어?', dialog => {
            const search = input(this.query);
            search.maxLength = 60;
            const region = input(this.region);
            region.maxLength = 30;
            dialog.append(field('음악 · 관심사 · 닉네임', search), field('활동 지역 (예: 서울 마포구)', region), el('p', 'dw-muted', '검색에도 연령·공개 범위·차단 설정이 적용돼.'), button('적용하기', () => { this.query = search.value; this.region = region.value; this.closeModal(); void this.reload(); }, 'dw-primary'), button('필터 초기화', () => { this.query = ''; this.region = ''; this.closeModal(); void this.reload(); }));
        });
    }
    async optOut() { this.openDialog('연애 기능을 끌까?', dialog => { dialog.append(el('p', '', '연애 프로필과 기존 매칭이 닫혀. 다시 켜도 종료된 연결은 복구되지 않아.'), button('기능 끄기', async () => { if (await this.perform(() => this.options.request('PUT', '/api/v3/dating/preferences', { enabled: false }))) {
        this.closeModal();
        void this.reload();
    } }, 'dw-primary')); }); }
    async renderEvents(rev) {
        const spaces = await this.options.request('GET', '/api/v3/spaces');
        const events = [];
        for (const s of spaces.items.filter(x => x.membership === 'active' || x.membership === 'muted').slice(0, 10)) {
            const r = await this.options.request('GET', `/api/v3/spaces/${encodeURIComponent(s.id)}/events`);
            events.push(...r.items);
        }
        if (!this.alive || rev !== this.revision)
            return;
        const list = el('section', 'dw-event-list');
        list.append(el('h3', '', '온라인 취향을, 오프라인 약속으로.'));
        if (!events.length)
            list.append(el('p', 'dw-empty', '참여 중인 모임의 예정된 일정이 여기에 보여. 먼저 아래 관심사 공간에 가입해 줘.'));
        for (const e of events) {
            const date = new Date(Date.parse(e.startAt) + 9 * 3600000);
            const calendar = append(el('div', 'dw-calendar'), el('small', '', `${date.getUTCMonth() + 1}월`), el('strong', '', String(date.getUTCDate())));
            list.append(append(el('article', 'dw-event'), calendar, append(el('div', 'dw-event-detail'), el('h4', '', e.title), el('p', '', e.region), el('small', '', fmt(e.startAt)), button('장소 · 시간 같이 정하기', () => this.openPlan(e), 'dw-primary'))));
        }
        list.append(el('p', 'dw-policy-note', '주소는 참가 승인 후에만 보여. 장소와 시간이 바뀌면 참가 확인도 다시 받아.'));
        if (this.options.operator)
            list.append(button('운영 검수 열기', () => this.admin(), 'dw-button'));
        this.body.replaceChildren(list);
    }
    async openPlan(event) {
        await this.perform(() => this.options.request('GET', `/api/v3/events/${event.id}/proposals`), plan => {
            this.openDialog(event.title, dialog => {
                dialog.classList.add('dw-plan-dialog');
                dialog.append(el('p', 'dw-muted', plan.approved ? '공개된 장소 후보를 확인하고 한 표를 골라 줘.' : '참가 승인 전에는 정확한 장소를 숨겨 두었어.'));
                for (const p of plan.items) {
                    const row = append(el('article', 'dw-proposal'), el('span', 'dw-badge', { proposed: '운영 확인 중', approved: '투표 가능', confirmed: '약속 확정' }[p.status] ?? p.status), el('h4', '', p.label), el('p', '', p.venue ?? `${p.region} · 운영 확인 및 참가 승인 후 장소 공개`), el('small', '', fmt(p.startAt)), el('strong', 'dw-votes', `${p.votes}표`));
                    if (plan.approved && !plan.confirmed && p.status === 'approved')
                        row.append(button(p.selected ? '선택 취소 불가 · 다른 후보 선택 가능' : '이 장소에 한 표', async () => { if (await this.perform(() => this.options.request('PUT', `/api/v3/events/${event.id}/venue-vote`, { proposalId: p.id }))) {
                            this.closeModal();
                            void this.openPlan(event);
                        } }, p.selected ? 'dw-selected' : 'dw-button'));
                    if (plan.staff && plan.approved && !plan.confirmed && p.status === 'approved')
                        row.append(button('이 약속으로 확정', () => this.confirmPlan(event, p), 'dw-text-button'));
                    dialog.append(row);
                }
                if (!plan.items.length)
                    dialog.append(el('p', 'dw-empty', '아직 후보가 없어. 첫 장소를 제안해 봐.'));
                if (plan.approved && !plan.confirmed)
                    dialog.append(button('장소 후보 제안하기', () => this.proposalForm(event), 'dw-primary'));
            });
        });
    }
    confirmPlan(event, p) { this.openDialog('장소와 시간을 확정할까?', d => { d.append(el('p', '', `${p.label}로 확정하면 참가자에게 변경된 약속을 다시 확인받아. 이전 장소 동의로 자동 참석 처리하지 않아.`), button('확정하고 참가 재확인 받기', async () => { if (await this.perform(() => this.options.request('PUT', `/api/v3/events/${event.id}/venue-confirmation`, { proposalId: p.id }))) {
        this.closeModal();
        this.say('확정했어. 다른 참가자는 변경된 약속에 다시 승인받아야 해.');
        void this.openPlan(event);
    } }, 'dw-primary')); }); }
    proposalForm(event) {
        this.openDialog('같이 만날 장소를 제안해 줘.', d => {
            const label = input(), region = input(event.region), venue = input(), kind = el('select');
            for (const [value, name] of [['CAFE', '카페'], ['LIBRARY', '도서관'], ['CULTURE', '문화공간'], ['PARK', '공원'], ['PUBLIC_FACILITY', '공공시설']]) {
                const o = el('option', '', name);
                o.value = value;
                kind.append(o);
            }
            const start = input('', 'datetime-local'), end = input('', 'datetime-local');
            const clientId = newClientId();
            d.append(field('후보 제목', label), field('활동 지역', region), field('공개 장소 이름 · 주소', venue), field('장소 종류', kind), field('시작 (현재 기기의 현지 시각)', start), field('종료 (현재 기기의 현지 시각)', end), el('p', 'dw-policy-note', '청소년 포함 일정은 한국 시각 09:00~19:59. 상세 장소는 참가 승인자와 검수 운영자만 확인해.'), button('검수 요청하기', async () => {
                if (!start.value || !end.value) {
                    this.say('시작과 종료 시간을 골라 줘.');
                    return;
                }
                if (await this.perform(() => this.options.request('POST', `/api/v3/events/${event.id}/proposals`, { label: label.value, region: region.value, venue: venue.value, venueKind: kind.value, startAt: new Date(start.value).toISOString(), endAt: new Date(end.value).toISOString(), clientId }))) {
                    this.closeModal();
                    this.say('장소 후보를 저장했어. 운영 확인 후 투표할 수 있어.');
                    void this.openPlan(event);
                }
            }, 'dw-primary'));
        });
    }
    async renderMatches(rev) {
        if (!this.state?.datingOpen || !this.state.preference?.enabled) {
            this.renderOptIn();
            return;
        }
        const result = await this.options.request('GET', '/api/v3/dating/matches');
        if (!this.alive || rev !== this.revision)
            return;
        const box = append(el('section', 'dw-matches'), el('h3', '', '서로 선택한 사람들'), el('p', 'dw-muted', '상대의 답장을 재촉하지 않아도 괜찮아.'));
        for (const m of result.items)
            box.append(append(el('article', 'dw-event'), el('span', 'dw-small-avatar', m.person.nickname.slice(0, 1)), append(el('div', 'dw-event-detail'), el('h4', '', `${m.person.nickname} · ${m.person.age}`), el('p', '', '서로 좋아요한 연결'), button('대화 열기', () => this.openChat(m), 'dw-primary'))));
        if (!result.items.length)
            box.append(el('p', 'dw-empty', '서로 좋아요한 사람이 생기면 여기에 보여.'));
        box.append(button('목록 새로고침', () => this.reload()));
        this.body.replaceChildren(box);
    }
    async openChat(match) {
        const result = await this.perform(() => this.options.request('GET', `/api/v3/dating/matches/${match.id}/messages`));
        if (!result)
            return;
        this.openDialog(`${match.person.nickname}님과의 대화`, dialog => {
            const messages = el('div', 'dw-messages');
            for (const m of result.items) {
                const n = append(el('article', `dw-bubble ${m.sender_id === this.options.userId ? 'own' : ''}`), el('p', '', m.text), el('small', '', m.status === 'review' ? '검수 중 · 상대에게 아직 보이지 않음' : '샘플 메모리에 저장됨'), button('신고', () => this.report('DATING_MESSAGE', m.id), 'dw-text-button'));
                messages.append(n);
            }
            const draft = this.draftByMatch.get(match.id) ?? { text: '', clientId: newClientId() };
            this.draftByMatch.set(match.id, draft);
            const text = el('textarea');
            text.maxLength = 1000;
            text.value = draft.text;
            text.setAttribute('aria-label', '연결된 대화 메시지');
            text.addEventListener('input', () => { if (draft.text !== text.value)
                draft.clientId = newClientId(); draft.text = text.value; send.disabled = !text.value.trim(); });
            text.addEventListener('compositionstart', () => { this.composing = true; });
            text.addEventListener('compositionend', () => { this.composing = false; });
            const send = button('보내기', async () => {
                if (this.composing || !text.value.trim() || this.busy)
                    return;
                const r = await this.perform(() => this.options.request('POST', `/api/v3/dating/matches/${match.id}/messages`, { text: draft.text, clientId: draft.clientId }));
                if (r) {
                    this.draftByMatch.delete(match.id);
                    this.closeModal();
                    void this.openChat(match);
                }
            }, 'dw-primary');
            send.disabled = !text.value.trim();
            dialog.append(messages, text, send, button('대화 새로고침', () => { if (this.composing)
                return; this.closeModal(); void this.openChat(match); }), button('연결 종료', () => this.openDialog('이 연결을 종료할까?', d => { d.append(el('p', '', '종료한 연결은 다시 열리지 않아. 필요한 신고는 먼저 남겨 줘.'), button('연결 종료하기', async () => { if (await this.perform(() => this.options.request('DELETE', `/api/v3/dating/matches/${match.id}`))) {
                this.closeModal();
                void this.reload();
            } }, 'dw-primary')); }), 'dw-text-button'));
        });
    }
    report(targetType, targetId) {
        this.openDialog('불편했던 일을 알려줘.', dialog => {
            const reason = el('select');
            for (const [value, name] of [['MINOR_SAFETY', '청소년 안전'], ['HARASSMENT', '괴롭힘'], ['PERSONAL_INFO', '개인정보'], ['SEXUAL_CONTENT', '성적 내용'], ['SCAM', '사기'], ['OTHER', '기타']]) {
                const o = el('option', '', name);
                o.value = value;
                reason.append(o);
            }
            const note = el('textarea');
            note.maxLength = 1000;
            dialog.append(field('신고 사유', reason), field('추가 설명 (선택)', note), button('신고 접수하기', async () => { if (await this.perform(() => this.options.request('POST', '/api/v3/discovery/reports', { targetType, targetId, reason: reason.value, description: note.value }))) {
                this.closeModal();
                this.say('신고를 접수했어. 검수 결과는 운영자 확인이 필요해.');
            } }, 'dw-primary'));
        });
    }
    block(card) { this.openDialog(`${card.nickname}님을 차단할까?`, d => { d.append(el('p', '', '프로필과 대화에서 서로 보이지 않게 돼. 차단을 풀어도 닫힌 대화는 복구되지 않아.'), button('차단하기', async () => { if (await this.perform(() => this.options.request('POST', '/api/v3/blocks', { targetId: card.id }))) {
        this.closeModal();
        void this.reload();
    } }, 'dw-primary')); }); }
    async admin() {
        const q = await this.perform(() => this.options.request('GET', '/api/v3/admin/discovery-review'));
        if (!q)
            return;
        this.openDialog('장소 · 신고 운영 검수', d => {
            d.append(el('p', 'dw-policy-note', '장소의 공개성·실제 영업 정보는 운영자가 별도로 확인한 뒤 승인해. 자동 분류는 확인 완료가 아니야.'));
            const action = async (path, body) => { if (await this.perform(() => this.options.request('PUT', path, body))) {
                this.closeModal();
                void this.admin();
            } };
            for (const p of q.proposals)
                d.append(append(el('article', 'dw-proposal'), el('h4', '', p.label), el('p', '', p.exact_venue), button('장소 확인 후 승인', () => action(`/api/v3/admin/venue-proposals/${p.id}`, { action: 'approve' })), button('반려', () => action(`/api/v3/admin/venue-proposals/${p.id}`, { action: 'reject' }))));
            for (const r of q.reports)
                d.append(append(el('article', 'dw-proposal'), el('h4', '', r.reason), el('p', '', r.description), button('신고 처리 완료', () => action('/api/v3/admin/discovery-content', { targetType: 'REPORT', targetId: r.id, action: 'resolve' }))));
            for (const m of q.heldMessages)
                d.append(append(el('article', 'dw-proposal'), el('p', '', m.text), button('검수 후 공개', () => action('/api/v3/admin/discovery-content', { targetType: 'DATING_MESSAGE', targetId: m.id, action: 'publish' })), button('콘텐츠 제거', () => action('/api/v3/admin/discovery-content', { targetType: 'DATING_MESSAGE', targetId: m.id, action: 'remove' }))));
            if (!q.proposals.length && !q.reports.length && !q.heldMessages.length)
                d.append(el('p', '', '현재 처리할 항목이 없어.'));
        });
    }
    openDialog(title, render) {
        this.closeModal();
        const focus = document.activeElement;
        const d = el('dialog', 'dw-dialog');
        d.setAttribute('aria-label', title);
        d.append(append(el('header', 'dw-dialog-head'), el('h3', '', title), button('닫기', () => this.closeModal(), 'dw-close')));
        render(d);
        const localStatus = el('p', 'dw-modal-status');
        localStatus.role = 'status';
        d.append(localStatus);
        const observer = new MutationObserver(() => { localStatus.textContent = this.status.textContent; });
        observer.observe(this.status, { childList: true, characterData: true, subtree: true });
        d.addEventListener('close', () => { observer.disconnect(); d.remove(); if (this.modal === d)
            this.modal = null; if (focus?.isConnected)
            focus.focus(); });
        document.body.append(d);
        this.modal = d;
        d.showModal();
    }
    closeModal() { this.modal?.close(); this.modal = null; this.composing = false; }
    destroy() { this.releasePhotos(); this.alive = false; this.revision++; this.closeModal(); this.draftByMatch.clear(); this.cards = []; this.root.replaceChildren(); }
}
;window.DiscoveryWorkspace=DiscoveryWorkspace;})();
