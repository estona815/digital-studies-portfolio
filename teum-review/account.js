(()=>{const node = (tag, cls = '', text = '') => { const e = document.createElement(tag); e.className = cls; e.textContent = text; return e; };
const button = (text, action, cls = 'dw-button') => { const e = node('button', cls, text); e.type = 'button'; e.onclick = () => void action(); return e; };
const label = (text, control) => { const e = node('label', 'dw-field', text); control.setAttribute('aria-label', text); e.append(control); return e; };
const requestId = () => { if (typeof crypto.randomUUID === 'function')
    return crypto.randomUUID(); const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128; const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join(''); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`; };
const message = (e) => { if (e instanceof Error)
    return e.message; return '요청을 완료하지 못했어요. 다시 확인해 주세요.'; };
function input(value, maxLength = 240) { const e = node('input'); e.value = value; e.maxLength = maxLength; return e; }
function select(value, options) { const e = node('select'); for (const [key, text] of options) {
    const o = node('option', '', text);
    o.value = key;
    e.append(o);
} e.value = value; return e; }
/** Real UI; sample account switching and sample identities never live inside this class. */
class AccountWorkspace {
    root;
    options;
    alive = true;
    generation = 0;
    busy = false;
    urls = new Set();
    receipt = null;
    body = node('section', 'aw-body');
    status = node('p', 'dw-status');
    modal = null;
    constructor(root, options) {
        this.root = root;
        this.options = options;
        root.classList.add('dw', 'aw');
        const head = node('header', 'aw-heading');
        head.append(node('h2', '', '내 정보와 사진'), button('사람 카드로', () => options.onBack?.()));
        this.status.role = 'status';
        this.status.setAttribute('aria-live', 'polite');
        root.replaceChildren(head, this.status, this.body);
        void this.load();
    }
    say(text) { if (this.alive)
        this.status.textContent = text; const live = this.modal?.querySelector('[role=status]'); if (live)
        live.textContent = text; }
    releaseImages() { for (const url of this.urls)
        URL.revokeObjectURL(url); this.urls.clear(); }
    async run(fn) { if (this.busy || !this.alive)
        return null; const gen = this.generation; this.busy = true; this.root.setAttribute('aria-busy', 'true'); try {
        const value = await fn();
        return this.alive && gen === this.generation ? value : null;
    }
    catch (e) {
        if (this.alive && gen === this.generation)
            this.say(message(e));
        return null;
    }
    finally {
        this.busy = false;
        if (this.alive && gen === this.generation)
            this.root.removeAttribute('aria-busy');
    } }
    async load() {
        const gen = ++this.generation;
        this.releaseImages();
        this.body.replaceChildren(node('p', 'dw-muted', '내 정보를 불러오는 중…'));
        try {
            const p = await this.options.request('GET', '/api/v3/account/settings');
            if (!this.alive || gen !== this.generation)
                return;
            if (p.status === 'deleted') {
                this.body.replaceChildren(node('h3', '', '삭제 처리 중인 계정이에요.'), node('p', '', '다른 사람에게 프로필이 보이지 않아요. 저장해 둔 접수번호로 처리 상태를 확인할 수 있어요.'));
                this.receiptForm();
                return;
            }
            this.renderSettings(p);
            const photos = await this.options.request('GET', '/api/v3/account/photos');
            if (!this.alive || gen !== this.generation)
                return;
            this.renderPhotos(photos.items, gen);
            this.renderPrivacy(p);
            if (this.options.operator)
                this.body.append(button('사진 · 삭제 운영 검수', () => this.renderAdmin(), 'dw-primary'));
        }
        catch (e) {
            if (this.alive && gen === this.generation) {
                this.body.replaceChildren(node('p', 'dw-empty', message(e)), button('다시 확인', () => this.load()));
                this.receiptForm();
            }
        }
    }
    renderSettings(p) {
        this.body.replaceChildren();
        const form = node('form', 'aw-section');
        form.append(node('h3', '', '나를 소개하는 방법'));
        const nickname = input(p.nickname, 20), bio = node('textarea'), region = input(p.region, 30), interests = input(p.interests.join(', '), 250), music = input(p.music.join(', '), 160);
        bio.value = p.bio;
        bio.maxLength = 240;
        const visibility = select(p.visibility, [['EVERYONE', '같은 이용 연령대에 공개'], ['SAME_GROUP_ONLY', '함께하는 모임에만'], ['CONNECTIONS', '연결된 사람에게만'], ['PRIVATE', '비공개']]);
        const dm = select(p.dmPolicy, [['REQUEST_ONLY', '요청을 확인한 뒤 대화'], ['CONNECTIONS_ONLY', '이미 연결된 사람만'], ['OFF', '개인 대화 받지 않기']]);
        form.append(label('닉네임', nickname), label('한 줄 소개', bio), label('활동 지역', region), label('관심사 5~8개 (쉼표로 구분)', interests), label('음악 취향 3~5개 (쉼표로 구분)', music), label('프로필 공개 범위', visibility), label('대화 요청', dm), node('p', 'dw-policy-note', '학교·집 주소·전화번호는 쓰지 말아 주세요. 나이와 인증 상태는 여기서 바꿀 수 없어요.'));
        const save = button('내 정보 저장', () => { }, 'dw-primary');
        save.type = 'submit';
        form.append(save);
        form.onsubmit = async (e) => { e.preventDefault(); const result = await this.run(() => this.options.request('PUT', '/api/v3/account/settings', { nickname: nickname.value, bio: bio.value, region: region.value, interests: interests.value.split(',').map(x => x.trim()).filter(Boolean), music: music.value.split(',').map(x => x.trim()).filter(Boolean), visibility: visibility.value, dmPolicy: dm.value })); if (result)
            this.say('내 정보를 저장했어요.'); };
        this.body.append(form);
    }
    renderPhotos(items, gen) {
        const section = node('section', 'aw-section');
        section.append(node('h3', '', '내 프로필 사진'), node('p', 'dw-muted', '최대 6장. 이 탭의 메모리에서만 체험해요. 실제 서버 업로드·유해 이미지 심사는 하지 않아요.'));
        const grid = node('div', 'aw-photo-grid');
        for (const p of items) {
            const card = node('article', 'aw-photo');
            const img = node('img');
            img.alt = p.status === 'approved' ? '승인된 내 사진' : '아직 공개되지 않은 내 사진';
            img.width = 180;
            img.height = 180;
            card.append(img, node('span', 'dw-badge', { pending: '검수 대기', approved: '공개 가능', rejected: '반려' }[p.status] ?? p.status), button('사진 삭제', async () => { const r = await this.run(() => this.options.request('DELETE', `/api/v3/account/photos/${p.id}`)); if (r) {
                this.say(r.storageDeleted ? '사진을 삭제했어요.' : '사진 노출을 닫았어요. 저장소 삭제는 재시도 중이에요.');
                void this.load();
            } }, 'dw-text-button'));
            grid.append(card);
            void this.fillPhoto(img, p.id, gen, false);
        }
        section.append(grid);
        const file = node('input');
        file.type = 'file';
        file.accept = 'image/jpeg,image/png,image/webp';
        file.disabled = items.length >= 6;
        let prepared = null;
        file.onchange = () => { prepared = null; };
        section.append(label('새 사진 선택', file), button('사진 검수 요청', async () => {
            if (!file.files?.[0]) {
                this.say('사진을 먼저 선택해 주세요.');
                return;
            }
            const r = await this.run(async () => { if (!prepared)
                prepared = { base64: await this.prepare(file.files[0]), clientId: requestId() }; if (!this.alive)
                throw Error('화면이 닫혀 전송하지 않았어요.'); return this.options.request('POST', '/api/v3/account/photos', prepared); });
            if (r) {
                this.say('샘플 사진을 등록했어요. 이 화면 밖으로 전송되지 않아요.');
                void this.load();
            }
        }, 'dw-primary'));
        this.body.append(section);
    }
    async prepare(file) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
            throw Error('8MB 이하 JPEG·PNG·WebP 사진을 선택해 주세요.');
        const bitmap = await createImageBitmap(file);
        try {
            if (bitmap.width * bitmap.height > 12_000_000 || Math.min(bitmap.width, bitmap.height) < 32)
                throw Error('사진은 최소 32px, 최대 1,200만 화소로 선택해 주세요.');
            const ratio = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)), canvas = node('canvas');
            canvas.width = Math.round(bitmap.width * ratio);
            canvas.height = Math.round(bitmap.height * ratio);
            const ctx = canvas.getContext('2d');
            if (!ctx)
                throw Error('이 브라우저에서 사진을 변환하지 못했어요.');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            for (const quality of [.82, .66, .5]) {
                const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
                if (base64 && base64.length <= Math.ceil(512 * 1024 / 3) * 4)
                    return base64;
            }
            throw Error('사진을 더 작게 저장한 뒤 다시 선택해 주세요.');
        }
        finally {
            bitmap.close();
        }
    }
    async fillPhoto(img, id, gen, admin) {
        try {
            const r = await this.options.request('GET', admin ? `/api/v3/admin/photos/${id}/content` : `/api/v3/profile-photos/${id}/content`);
            if (!this.alive || gen !== this.generation || !img.isConnected)
                return;
            if (r.contentType !== 'image/jpeg' || r.base64.length > 700_000)
                throw Error('잘못된 사진 응답');
            const bytes = Uint8Array.from(atob(r.base64), x => x.charCodeAt(0));
            const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
            this.urls.add(url);
            img.src = url;
        }
        catch {
            if (this.alive && img.isConnected) {
                img.removeAttribute('src');
                img.alt = '사진을 불러오지 못했어요. 새로고침해 주세요.';
            }
        }
    }
    renderPrivacy(p) {
        const section = node('section', 'aw-section aw-privacy');
        section.append(node('h3', '', '내 데이터는 내가 관리해요.'), node('p', 'dw-muted', '내보내기에는 내 프로필과 내가 쓴 글·메시지·투표, 사진 정보가 포함돼요. 다른 사람의 대화와 검수 내부정보는 제외돼요.'));
        section.append(button('내 작성 데이터 내려받기', () => this.exportData(), 'dw-button'), button('계정 삭제 안내', () => this.confirmDeletion(p), 'aw-danger'), button('접수번호로 삭제 상태 확인', () => this.receiptForm()));
        this.body.append(section);
    }
    async exportData() {
        await this.run(async () => {
            const out = { format: 'teum-user-export-0.6', exportedAt: new Date().toISOString(), scope: '선택된 본인 작성 데이터; 모든 처리 데이터에 대한 법적 열람회신을 대신하지 않음' };
            let total = 0;
            for (const section of ['profile', 'posts', 'entries', 'messages', 'datingMessages', 'photos', 'moments', 'polls']) {
                let after = null;
                const items = [];
                const seen = new Set();
                do {
                    const page = await this.options.request('POST', '/api/v3/account/export', { section, after });
                    items.push(...page.items);
                    total += page.items.length;
                    if (total > 50_000)
                        throw Error('내보내기 항목이 많아요. 운영자에게 별도 내보내기를 요청해 주세요. 일부 파일을 완료본으로 저장하지 않았어요.');
                    after = page.nextAfter;
                    if (after && seen.has(after))
                        throw Error('내보내기 페이지가 반복되어 중단했어요.');
                    if (after)
                        seen.add(after);
                    if (!this.alive)
                        return;
                } while (after);
                out[section] = items;
            }
            if (!this.alive)
                return;
            this.download('TEUM_내작성데이터.json', out);
            this.say('선택된 작성 데이터를 빠짐없이 페이지별로 받아 파일로 저장했어요.');
        });
    }
    download(name, value) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })), a = node('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
    confirmDeletion(p) {
        this.dialog('계정을 삭제할까요?', d => {
            d.append(node('p', '', '요청 즉시 프로필과 대화 접근을 닫고, 내가 연 모임과 약속을 종료해요. 사진 저장소와 앱 데이터 삭제는 별도 처리 결과를 확인해야 해요. 이 작업은 되돌릴 수 없어요.'), node('p', 'dw-policy-note', '법적 보존이 필요한 기록은 근거와 기한을 확인해 별도로 처리해야 해요. 로그인 제공자 계정과 외부 백업 삭제는 이 화면에서 완료됐다고 표시하지 않아요.'));
            const check = node('input');
            check.type = 'checkbox';
            const text = input('', 20);
            d.append(label('삭제 범위와 모임 종료를 확인했어요', check), label('계정 삭제를 입력해 주세요', text), button('삭제 요청 확정', async () => {
                if (!check.checked || text.value !== '계정 삭제') {
                    this.say('안내 확인과 계정 삭제 입력이 필요해요.');
                    return;
                }
                const r = await this.run(() => this.options.request('POST', '/api/v3/account/deletion', { confirmation: text.value, policyVersion: p.policyVersion }));
                if (r) {
                    this.receipt = r;
                    this.closeDialog();
                    this.releaseImages();
                    this.body.replaceChildren(node('h3', '', '삭제 요청을 접수했어요.'), node('p', '', '프로필 노출과 연결은 닫혔어요. 아직 모든 데이터 삭제가 완료된 것은 아니에요.'));
                    this.receiptForm();
                    this.download('TEUM_삭제접수번호.json', { receiptId: r.receiptId, notice: '이 접수번호와 동일한 로그인 계정으로 상태 확인. 외부 계정 삭제 아님.' });
                    this.options.onDeleted?.();
                }
            }, 'aw-danger'));
        });
    }
    receiptForm() { if (this.body.querySelector('[data-receipt]'))
        return; const section = node('section', 'aw-section'); section.dataset.receipt = 'true'; const text = input(this.receipt?.receiptId ?? '', 36), result = node('p'); section.append(label('삭제 접수번호', text), button('삭제 처리 상태 확인', async () => { const r = await this.run(() => this.options.request('POST', '/api/v3/account/deletion-status', { receiptId: text.value })); if (r) {
        this.receipt = r;
        result.textContent = { queued: '접수 완료 · 앱 데이터 삭제 전', storage_pending: '사진 저장소 삭제 재시도 필요', review_required: '보존 사유 확인 중', complete: '앱 데이터 삭제 처리 완료 · 외부 로그인 계정/백업은 별도' }[r.state] ?? r.state;
    } }), result); this.body.append(section); }
    async renderAdmin() {
        const gen = ++this.generation;
        this.releaseImages();
        this.body.replaceChildren(node('p', '', '운영 대기열을 확인하고 있어요.'));
        try {
            const [photos, jobs] = await Promise.all([this.options.request('GET', '/api/v3/admin/photos'), this.options.request('GET', '/api/v3/admin/deletions')]);
            if (!this.alive || gen !== this.generation)
                return;
            this.body.replaceChildren(node('h3', '', '사진 검수와 데이터 삭제'), node('p', 'dw-policy-note', '실제 운영자가 사진과 신고 사유를 확인해야 해요. 본인 사진은 직접 승인할 수 없어요.'));
            for (const p of photos.items) {
                const row = node('article', 'aw-review');
                const img = node('img');
                img.alt = '검수 대기 사진';
                img.width = 180;
                img.height = 180;
                row.append(img, node('p', '', `사진 ${p.id.slice(0, 8)} · 검수 대기`));
                for (const [action, text] of [['approve', '사진 확인 후 승인'], ['reject', '사진 반려']])
                    row.append(button(text, async () => { if (await this.run(() => this.options.request('PUT', `/api/v3/admin/photos/${p.id}`, { action })))
                        void this.renderAdmin(); }));
                this.body.append(row);
                void this.fillPhoto(img, p.id, gen, true);
            }
            if (!photos.items.length)
                this.body.append(node('p', 'dw-empty', '검수 대기 사진이 없어요.'));
            for (const j of jobs.items) {
                const row = node('article', 'aw-review');
                row.append(node('h4', '', `삭제 접수 ${j.id.slice(0, 8)}`), node('p', '', j.state), button('삭제 처리 실행', () => this.dialog('앱 데이터 삭제 처리', d => { d.append(node('p', '', '보존 사유 확인 후 사진과 앱 데이터를 삭제해요. 실패한 작업은 완료로 처리하지 않아요.'), button('삭제 작업 실행', async () => { const r = await this.run(() => this.options.request('POST', `/api/v3/admin/deletions/${j.id}/process`, {})); if (r) {
                    this.closeDialog();
                    this.say(`처리 상태: ${r.state}`);
                    void this.renderAdmin();
                } }, 'aw-danger')); })));
                this.body.append(row);
            }
            this.body.append(button('대기열 새로고침', () => this.renderAdmin()), button('내 정보로 돌아가기', () => this.load()));
        }
        catch (e) {
            if (this.alive && gen === this.generation)
                this.body.replaceChildren(node('p', 'dw-empty', message(e)), button('내 정보로', () => this.load()));
        }
    }
    dialog(title, render) { this.closeDialog(); const focus = document.activeElement, d = node('dialog', 'dw-dialog aw-dialog'); d.setAttribute('aria-label', title); d.append(node('h3', '', title), button('닫기', () => this.closeDialog(), 'dw-close')); render(d); const status = node('p', 'dw-modal-status'); status.role = 'status'; d.append(status); d.addEventListener('close', () => { d.remove(); if (this.modal === d)
        this.modal = null; if (focus?.isConnected)
        focus.focus(); }); document.body.append(d); this.modal = d; d.showModal(); }
    closeDialog() { this.modal?.close(); this.modal = null; }
    destroy() { this.root.removeAttribute('aria-busy'); this.alive = false; this.generation++; this.closeDialog(); this.releaseImages(); this.body.replaceChildren(); this.root.replaceChildren(); this.root.classList.remove('aw'); }
}
;window.AccountWorkspace=AccountWorkspace;})();

// OFFLINE DEMONSTRATION ONLY. Browser memory, not server authorization or persistent social accounts.
