/* --- КОНФИГУРАЦИЯ И ДАННЫЕ --- */
const defaultQuestions = [
    { q: "Как называется эта игра?", a: ["Поле Чудес", "О, Счастливчик!", "Кто хочет стать миллионером?", "Слабое Звено"], c: 2 },
    { q: "Что используется для стилей веб-страниц?", a: ["HTML", "CSS", "Python", "Java"], c: 1 },
    { q: "Какое животное самое быстрое?", a: ["Гепард", "Лев", "Заяц", "Черепаха"], c: 0 },
    { q: "Сколько бит в байте?", a: ["4", "8", "16", "32"], c: 1 },
    { q: "Финальный вопрос: Ты доволен?", a: ["Нет", "Да", "Супер", "Возможно"], c: 2 }
];

const levelsData = [
    { sum: "500", safe: false }, { sum: "1 000", safe: true },
    { sum: "2 000", safe: false }, { sum: "3 000", safe: false }, { sum: "5 000", safe: true },
    { sum: "10 000", safe: false }, { sum: "15 000", safe: false }, { sum: "25 000", safe: false }, 
    { sum: "50 000", safe: true }, { sum: "100 000", safe: false }, { sum: "200 000", safe: false }, 
    { sum: "400 000", safe: false }, { sum: "800 000", safe: false }, { sum: "1 500 000", safe: false }, 
    { sum: "3 000 000", safe: true }
];

const defaultRules = `Добро пожаловать в игру "Кто хочет стать миллионером?"!

1. Вам предстоит ответить на 15 вопросов, чтобы выиграть главный приз — 3 миллиона виртуальных рублей.
2. У каждого вопроса есть 4 варианта ответа, и только один из них верный.
3. У вас есть 3 подсказки:
   - 50:50 (убирает два неверных ответа)
   - Звонок другу (виртуальный помощник)
4. В игре есть две "несгораемые суммы": 1 000 и 32 000.
5. На обдумывание вопроса дается 30 секунд. Если время истечет — вы проиграете!

Удачи!`;

/* --- АУДИО КОНТРОЛЛЕР (NEW) --- */
class AudioController {
    constructor() {
        this.tracks = {
            // ФОНОВЫЕ ТРЕКИ (MUSIC)
            bg_menu: new Audio('assets/sounds/bg_menu.mp3'),
            bg_easy: new Audio('assets/sounds/bg_easy.mp3'),   // Вопросы 1-5
            bg_medium: new Audio('assets/sounds/bg_medium.mp3'), // Вопросы 6-10
            bg_hard: new Audio('assets/sounds/bg_hard.mp3'),     // Вопросы 11-15
            
            // ЭФФЕКТЫ (SFX)
            intro: new Audio('assets/sounds/intro.mp3'),
            game_over: new Audio('assets/sounds/game_over.mp3'),
            timeout: new Audio('assets/sounds/timeout.mp3'),
            
            // ГЕЙМПЛЕЙ (SFX)
            correct: new Audio('assets/sounds/correct.mp3'),
            wrong: new Audio('assets/sounds/wrong.mp3'),
            lifeline: new Audio('assets/sounds/lifeline_5050.mp3'),
            
            // UI (SFX)
            timer: new Audio('assets/sounds/timer_tick.mp3'),
            selected: new Audio('assets/sounds/answer_selected.mp3'), // Желтый выбор
            locked: new Audio('assets/sounds/answer_locked.mp3')      // Галочка (принято)
        };

        this.currentMusic = null;
        this.masterVolume = 0.5;

        // Зацикливание фоновых треков
        ['bg_menu', 'bg_easy', 'bg_medium', 'bg_hard', 'timer'].forEach(k => {
            if(this.tracks[k]) {
                this.tracks[k].loop = true;
                this.tracks[k].volume = this.masterVolume;
            }
        });
    }

    /* --- 1. МУЗЫКА (ФОН) --- */
    playMusic(trackName) {
        const newTrack = this.tracks[trackName];
        if (!newTrack) return;
        if (this.currentMusic === newTrack) return; // Уже играет

        // Плавный переход (Crossfade)
        if (this.currentMusic) {
            this.fadeOut(this.currentMusic);
        }

        newTrack.currentTime = 0;
        newTrack.volume = 0; // Start silent
        newTrack.play().catch(e => console.log("Audio Autoplay blocked:", e));
        this.fadeIn(newTrack);
        this.currentMusic = newTrack;
    }

    stopMusic() {
        if (this.currentMusic) {
            this.fadeOut(this.currentMusic);
            this.currentMusic = null;
        }
    }

    /* --- 2. ЭФФЕКТЫ (SFX) --- */
    playSFX(trackName, ducking = false) {
        const sound = this.tracks[trackName];
        if (!sound) return;

        sound.currentTime = 0;
        sound.volume = this.masterVolume;
        sound.loop = false; // SFX не зацикливаем (кроме таймера, он отдельно)
        
        // Таймер - особый случай (он loop)
        if (trackName === 'timer') sound.loop = true;

        sound.play().catch(e => console.log("SFX error:", e));

        // Ducking (Приглушение музыки на время эффекта)
        if (ducking && this.currentMusic) {
            this.duckMusic(true);
            sound.onended = () => this.duckMusic(false);
            // Страховка (если звук прервут)
            setTimeout(() => this.duckMusic(false), (sound.duration || 2) * 1000);
        }
    }

    stopSFX(trackName) {
        const sound = this.tracks[trackName];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    /* --- ХЕЛПЕРЫ --- */
    fadeIn(audio) {
        let vol = 0;
        const interval = setInterval(() => {
            if (vol < this.masterVolume) {
                vol += 0.05;
                audio.volume = Math.min(this.masterVolume, vol);
            } else {
                clearInterval(interval);
            }
        }, 50);
    }

    fadeOut(audio) {
        let vol = audio.volume;
        const interval = setInterval(() => {
            if (vol > 0.05) {
                vol -= 0.05;
                audio.volume = vol;
            } else {
                audio.pause();
                audio.currentTime = 0;
                clearInterval(interval);
            }
        }, 50);
    }

    duckMusic(enable) {
        if (!this.currentMusic) return;
        // Приглушаем до 20%
        const targetVol = enable ? this.masterVolume * 0.2 : this.masterVolume;
        this.currentMusic.volume = targetVol;
    }

    setVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
        if (this.currentMusic) this.currentMusic.volume = this.masterVolume;
    }
}

// Глобальный контроллер
const audioCtrl = new AudioController();


/* --- МЕНЕДЖЕР ШАБЛОНОВ --- */
class TemplateManager {
    constructor() {
        this.templates = JSON.parse(localStorage.getItem('millionaire_templates')) || [];
        this.currentEditorId = null; 

        this.listContainer = document.getElementById('templates-list');
        this.editorPanel = document.getElementById('template-editor-panel');
        this.emptyState = document.getElementById('editor-empty-state');
        this.questionsContainer = document.getElementById('questions-container');
        this.nameInput = document.getElementById('tpl-name-input');

        const createBtn = document.getElementById('create-new-tpl-btn');
        if(createBtn) createBtn.addEventListener('click', () => this.createNew());
        
        const saveBtn = document.getElementById('save-tpl-btn');
        if(saveBtn) saveBtn.addEventListener('click', () => this.saveCurrent());
        
        const delBtn = document.getElementById('delete-tpl-btn');
        if(delBtn) delBtn.addEventListener('click', () => this.deleteCurrent());
        
        const addQBtn = document.getElementById('add-q-card-btn');
        if(addQBtn) addQBtn.addEventListener('click', () => this.addQuestionCard());

        this.renderSidebar();
    }

    handleImageUpload(input) {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return alert("Файл слишком большой! (Макс 2МБ)");

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const parent = input.closest('.q-media-section');
            const previewDiv = parent.querySelector('.img-preview-mini');
            
            previewDiv.querySelector('img').src = base64;
            previewDiv.classList.remove('hidden');
            parent.querySelector('.q-img-data').value = base64;
            parent.querySelector('.upload-label').firstChild.textContent = '📷 Изменить фото ';
        };
        reader.readAsDataURL(file);
    }

    removeImage(btn) {
        const parent = btn.closest('.q-media-section');
        parent.querySelector('.q-img-data').value = '';
        parent.querySelector('.img-preview-mini').classList.add('hidden');
        parent.querySelector('.upload-label').firstChild.textContent = '📷 Добавить фото ';
    }

    renderSidebar() {
        if(!this.listContainer) return;
        this.listContainer.innerHTML = '';
        this.templates.forEach((tpl, idx) => {
            const el = document.createElement('div');
            el.className = `template-item ${this.currentEditorId === idx ? 'selected' : ''}`;
            el.innerHTML = `
                <div>
                    <div class="tpl-name">${tpl.name || 'Без названия'}</div>
                    <div class="tpl-count">${tpl.questions.length} вопросов</div>
                </div>
                ${tpl.isActive ? '<span style="color:#00cc00;">●</span>' : ''}
            `;
            el.onclick = () => this.openEditor(idx);
            this.listContainer.appendChild(el);
        });
    }

    openEditor(idx) {
        this.currentEditorId = idx;
        const tpl = this.templates[idx];
        
        if(this.emptyState) this.emptyState.classList.add('hidden');
        if(this.editorPanel) this.editorPanel.classList.remove('hidden');
        
        this.renderSidebar();
        this.nameInput.value = tpl.name;
        this.questionsContainer.innerHTML = ''; 
        
        tpl.questions.forEach((q, qIndex) => {
            this.addQuestionCard(q, qIndex);
        });
    }

    addQuestionCard(data = null, index = null) {
        const qData = data || { q: "", a: ["", "", "", ""], c: 0, img: null };
        const card = document.createElement('div');
        card.className = 'q-card';
        const radioGroup = `q_radio_${Date.now()}_${Math.random()}`; 

        card.innerHTML = `
            <div class="q-card-header">
                <span>Вопрос #${this.questionsContainer.children.length + 1}</span>
                <div class="q-card-actions">
                    <button title="Вверх" onclick="tplManager.moveCard(this, -1)">↑</button>
                    <button title="Вниз" onclick="tplManager.moveCard(this, 1)">↓</button>
                    <button class="delete-q" title="Удалить" onclick="this.closest('.q-card').remove()">✕</button>
                </div>
            </div>
            
            <div class="q-media-section">
                <label class="upload-label">
                    📷 ${qData.img ? 'Изменить фото' : 'Добавить фото'}
                    <input type="file" accept="image/*" style="display:none" onchange="tplManager.handleImageUpload(this)">
                </label>
                <input type="hidden" class="q-img-data" value="${qData.img || ''}">
                <div class="img-preview-mini ${qData.img ? '' : 'hidden'}">
                    <img src="${qData.img || ''}">
                    <button class="remove-img-btn" onclick="tplManager.removeImage(this)">x</button>
                </div>
            </div>

            <div class="q-input-group">
                <input type="text" class="full-width-input q-text-input" placeholder="Введите текст вопроса..." value="${qData.q}">
            </div>

            <div class="answers-grid-editor">
                ${qData.a.map((ans, i) => `
                    <div class="answer-option">
                        <input type="radio" name="${radioGroup}" class="radio-correct" value="${i}" ${qData.c === i ? 'checked' : ''}>
                        <input type="text" class="answer-input" placeholder="Вариант ${String.fromCharCode(65+i)}" value="${ans}">
                    </div>
                `).join('')}
            </div>
        `;

        this.questionsContainer.appendChild(card);
        if (!data) card.scrollIntoView({ behavior: 'smooth' });
    }

    saveCurrent() {
        if (this.currentEditorId === null) return;
        const name = this.nameInput.value.trim() || "Новый сценарий";
        const cards = this.questionsContainer.querySelectorAll('.q-card');
        const newQuestions = [];

        cards.forEach(card => {
            const qText = card.querySelector('.q-text-input').value.trim();
            if (!qText) return;

            const answerInputs = card.querySelectorAll('.answer-input');
            const answers = Array.from(answerInputs).map(inp => inp.value.trim());
            
            let correct = 0;
            const radios = card.querySelectorAll('.radio-correct');
            radios.forEach((r, i) => { if(r.checked) correct = i; });

            const imgData = card.querySelector('.q-img-data').value;
            newQuestions.push({ q: qText, a: answers, c: correct, img: imgData || null });
        });

        if (newQuestions.length === 0) return alert("Сценарий пуст!");

        this.templates[this.currentEditorId] = { name: name, questions: newQuestions, isActive: true };
        this.templates.forEach((t, i) => { if (i !== this.currentEditorId) t.isActive = false; });
        
        this.saveToStorage();
        this.renderSidebar();
        alert("Сценарий сохранен!");
    }

    createNew() {
        this.templates.push({ name: "Новый сценарий", questions: [], isActive: false });
        this.openEditor(this.templates.length - 1);
    }

    deleteCurrent() {
        if (confirm("Удалить этот сценарий?")) {
            this.templates.splice(this.currentEditorId, 1);
            this.saveToStorage();
            this.currentEditorId = null;
            this.renderSidebar();
            if(this.editorPanel) this.editorPanel.classList.add('hidden');
            if(this.emptyState) this.emptyState.classList.remove('hidden');
        }
    }

    moveCard(btn, direction) {
        const card = btn.closest('.q-card');
        if (direction === -1 && card.previousElementSibling) {
            card.parentNode.insertBefore(card, card.previousElementSibling);
        } else if (direction === 1 && card.nextElementSibling) {
            card.parentNode.insertBefore(card.nextElementSibling, card);
        }
    }

    saveToStorage() {
        localStorage.setItem('millionaire_templates', JSON.stringify(this.templates));
    }

    getActiveQuestions() {
        const active = this.templates.find(t => t.isActive);
        return active ? active.questions : defaultQuestions;
    }
}

const tplManager = new TemplateManager();
window.tplManager = tplManager;
let activeGame = null;


/* --- КЛАСС ИГРЫ --- */
class MillionaireGame {
    constructor(questionsData) {
        this.questions = questionsData;
        this.currentQIndex = 0;
        this.moneyIndex = 0;
        this.state = { paused: false, locked: false, preSelected: null, timeLeft: 30 };
        this.timerInterval = null;

        this.dom = {
            gameUI: document.getElementById('game-ui'),
            moneyTree: document.getElementById('money-tree'),
            confirmBtn: document.getElementById('confirm-answer-btn'),
            timerDisplay: document.getElementById('timer-display'),
            timerProgress: document.getElementById('timer-progress'),
            timerWrapper: document.querySelector('.timer-wrapper'),
            timerBtn: document.getElementById('timer-btn'),
            qText: document.getElementById('question-text'),
            answers: [0,1,2,3].map(i => {
                const wrappers = document.querySelectorAll('.answer-wrapper');
                const textEl = document.getElementById(`answer-text-${i}`);
                return { wrap: wrappers[i], text: textEl };
            }),
            lifelines: { fifty: document.getElementById('btn-5050'), phone: document.getElementById('btn-phone') }
        };

        this.initMoneyTree();
        this.initGameListeners();
        this.loadQuestion();
    }

    initMoneyTree() {
        if(!this.dom.moneyTree) return;
        this.dom.moneyTree.innerHTML = '';
        [...levelsData].reverse().forEach((lvl, idx) => {
            const realIdx = levelsData.length - 1 - idx;
            const div = document.createElement('div');
            div.className = `money-level ${lvl.safe ? 'safety' : ''}`;
            div.innerHTML = `<span>${realIdx + 1}</span> <span>${lvl.sum}</span>`;
            this.dom.moneyTree.appendChild(div);
        });
        this.updateMoneyTree();
    }

    updateMoneyTree() {
        if(!this.dom.moneyTree) return;
        const levels = this.dom.moneyTree.children;
        const domIndex = levelsData.length - 1 - this.moneyIndex;
        Array.from(levels).forEach((el, idx) => {
            el.classList.remove('active', 'passed');
            if (idx === domIndex) el.classList.add('active'); 
            if (idx > domIndex) el.classList.add('passed');
        });
    }

    loadQuestion() {
        // Сброс визуалов и состояния ответов
    this.dom.answers.forEach(el => {
        // Убираем классы цветов
        if(el.wrap) {
            el.wrap.classList.remove('pre-selected', 'correct', 'wrong');
            // ВАЖНО: Восстанавливаем видимость и кликабельность (после 50:50)
            el.wrap.style.opacity = 1; 
            el.wrap.style.pointerEvents = 'auto'; 
        }
        // Восстанавливаем текст (на всякий случай, хотя он перезапишется ниже)
        if(el.text) el.text.style.opacity = 1;
        });

        if (this.currentQIndex >= this.questions.length) {
            this.finishGame();
            return;
        }

        this.stopTimer();
        this.state.timeLeft = 30;
        this.updateTimerUI();
        this.state.locked = false;
        this.state.preSelected = null;
        if(this.dom.confirmBtn) this.dom.confirmBtn.classList.add('hidden');

        // Сброс визуалов
        this.dom.answers.forEach(el => {
            if(el.wrap) el.wrap.classList.remove('pre-selected', 'correct', 'wrong');
            if(el.text) el.text.style.opacity = 1;
        });

        // Данные вопроса
        const q = this.questions[this.currentQIndex];
        if(this.dom.qText) this.dom.qText.innerText = q.q;
        q.a.forEach((txt, i) => {
            if (this.dom.answers[i].text) this.dom.answers[i].text.innerText = txt;
        });

        // Картинка
        const imgArea = document.getElementById('question-image-area');
        const imgTag = document.getElementById('question-image');
        if (imgArea && imgTag) {
            if (q.img) {
                imgTag.src = q.img;
                imgArea.classList.remove('hidden');
            } else {
                imgArea.classList.add('hidden');
                imgTag.src = "";
            }
        }

        // --- МУЗЫКА (NEW) ---
        // Смена трека в зависимости от сложности
        if (this.currentQIndex < 5) audioCtrl.playMusic('bg_easy');
        else if (this.currentQIndex < 10) audioCtrl.playMusic('bg_medium');
        else audioCtrl.playMusic('bg_hard');
        
        // Сброс звуков SFX
        audioCtrl.stopSFX('timer');
        audioCtrl.stopSFX('selected');
        audioCtrl.stopSFX('locked');

        this.updateMoneyTree();
    }

    handleAnswerClick(idx) {
        if (this.state.locked || this.state.paused) return;
        this.state.preSelected = idx;
        
        // ЗВУК ВЫБОРА (ЖЕЛТЫЙ)
        audioCtrl.playSFX('selected');

        this.dom.answers.forEach(a => { if(a.wrap) a.wrap.classList.remove('pre-selected'); });
        if(this.dom.answers[idx].wrap) this.dom.answers[idx].wrap.classList.add('pre-selected');
        if(this.dom.confirmBtn) this.dom.confirmBtn.classList.remove('hidden');
    }

    confirmAnswer() {
        if (this.state.preSelected === null) return;
        this.state.locked = true;
        this.dom.confirmBtn.classList.add('hidden');
        this.stopTimer();

        // ЗВУК ПРИНЯТИЯ (ГАЛОЧКА)
        audioCtrl.playSFX('locked');
        audioCtrl.duckMusic(true); // Приглушаем музыку

        const idx = this.state.preSelected;
        const correct = this.questions[this.currentQIndex].c;
        const el = this.dom.answers[idx].wrap;
        el.classList.remove('pre-selected');

        // Пауза перед результатом (Нагнетание)
        setTimeout(() => {
            if (idx === correct) {
                el.classList.add('correct');
                // ЗВУК ПОБЕДЫ
                audioCtrl.playSFX('correct', true);
                
                setTimeout(() => {
                    this.moneyIndex++; 
                    this.currentQIndex++;
                    audioCtrl.duckMusic(false); // Возвращаем музыку
                    this.loadQuestion();
                }, 2000);
            } else {
                el.classList.add('wrong');
                if(this.dom.answers[correct].wrap) this.dom.answers[correct].wrap.classList.add('correct'); 
                
                // ЗВУК ПРОИГРЫША
                audioCtrl.playSFX('wrong', true);

                setTimeout(() => {
                    if (this.moneyIndex > 0) this.moneyIndex--;
                    this.currentQIndex++; 
                    audioCtrl.duckMusic(false);
                    this.loadQuestion();
                }, 3000);
            }
        }, 1500); // 1.5 сек нагнетания
    }

    startTimer() {
        if (this.timerInterval || this.state.paused) return;
        
        // ЗВУК ТАЙМЕРА
        audioCtrl.playSFX('timer');

        this.timerInterval = setInterval(() => {
            this.state.timeLeft--;
            this.updateTimerUI();
            if (this.state.timeLeft <= 0) {
                this.stopTimer();
                // ЗВУК ВРЕМЯ ВЫШЛО
                audioCtrl.playSFX('timeout');
                
                if (this.state.preSelected !== null) {
                    this.confirmAnswer();
                } else {
                    alert("Время вышло!");
                    this.currentQIndex++;
                    this.loadQuestion();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if(this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            audioCtrl.stopSFX('timer'); // Стоп звук
        }
    }

    updateTimerUI() {
        if(!this.dom.timerDisplay) return;
        this.dom.timerDisplay.innerText = this.state.timeLeft;
        const offset = 283 - (this.state.timeLeft / 30) * 283;
        if(this.dom.timerProgress) this.dom.timerProgress.style.strokeDashoffset = offset;
        if(this.dom.timerWrapper) {
            this.dom.timerWrapper.classList.remove('warning', 'danger');
            if(this.state.timeLeft <= 10) this.dom.timerWrapper.classList.add('warning');
            if(this.state.timeLeft <= 5) this.dom.timerWrapper.classList.add('danger');
        }
    }

    togglePause() {
        this.state.paused = !this.state.paused;
        const pauseScreen = document.getElementById('pause-screen');
        if (this.state.paused) {
            this.stopTimer();
            audioCtrl.stopMusic(); // Пауза музыки
            pauseScreen.classList.remove('hidden'); 
            pauseScreen.style.pointerEvents = 'auto';
        } else {
            if(this.state.timeLeft < 30 && !this.state.locked) this.startTimer();
            
            // Возобновляем музыку
            if (this.currentQIndex < 5) audioCtrl.playMusic('bg_easy');
            else if (this.currentQIndex < 10) audioCtrl.playMusic('bg_medium');
            else audioCtrl.playMusic('bg_hard');
            
            pauseScreen.classList.add('hidden'); 
        }
    }

    finishGame() {
        audioCtrl.stopMusic();
        audioCtrl.playSFX('game_over'); // ФИНАЛ

        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('victory-screen').classList.remove('hidden');
        let winSum = "0";
        if (this.moneyIndex > 0) winSum = levelsData[Math.max(0, this.moneyIndex - 1)].sum;
        document.getElementById('final-score-display').innerText = winSum + " ₽";
    }

    initGameListeners() {
        this.dom.answers.forEach((obj, i) => {
            if(!obj.wrap) return;
            const newWrap = obj.wrap.cloneNode(true);
            obj.wrap.parentNode.replaceChild(newWrap, obj.wrap);
            this.dom.answers[i].wrap = newWrap;
            this.dom.answers[i].text = newWrap.querySelector('.text'); 
            newWrap.addEventListener('click', () => this.handleAnswerClick(i));
        });

        const confirmBtn = this.dom.confirmBtn;
        if(confirmBtn) {
            const newConfirm = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
            this.dom.confirmBtn = newConfirm;
            this.dom.confirmBtn.addEventListener('click', () => this.confirmAnswer());
        }

        const timerBtn = this.dom.timerBtn;
        if(timerBtn) {
            const newTimerBtn = timerBtn.cloneNode(true);
            timerBtn.parentNode.replaceChild(newTimerBtn, timerBtn);
            this.dom.timerBtn = newTimerBtn; 
            this.dom.timerWrapper = newTimerBtn;
            this.dom.timerDisplay = newTimerBtn.querySelector('#timer-display');
            this.dom.timerProgress = newTimerBtn.querySelector('#timer-progress');
            this.dom.timerBtn.addEventListener('click', () => this.startTimer());
            this.dom.timerBtn.style.cursor = 'pointer';
        }

        if(this.dom.lifelines.fifty) {
            this.dom.lifelines.fifty.onclick = () => {
                if(this.state.locked || this.state.paused || this.dom.lifelines.fifty.classList.contains('used')) return;
                
                // ЗВУК ПОДСКАЗКИ
                audioCtrl.playSFX('lifeline', true);

                const correct = this.questions[this.currentQIndex].c;
                let wrong = [0,1,2,3].filter(i => i !== correct);
                wrong.sort(() => Math.random() - 0.5);
                wrong.slice(0, 2).forEach(i => {
                    if(this.dom.answers[i].text) this.dom.answers[i].text.innerText = "";
                    this.dom.answers[i].wrap.style.opacity = 0.5;
                    this.dom.answers[i].wrap.style.pointerEvents = 'none';
                });
                this.dom.lifelines.fifty.classList.add('used');
            };
        }
    }
}

/* --- ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ --- */
document.addEventListener('DOMContentLoaded', () => {

    // Фоновая музыка МЕНЮ (при клике)
    document.addEventListener('click', () => {
        if (!audioCtrl.currentMusic) audioCtrl.playMusic('bg_menu');
    }, { once: true });

    // Громкость
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audioCtrl.setVolume(e.target.value / 100);
        });
    }

    // --- ФУНКЦИИ ДЛЯ ПРАВИЛ ---
    function loadRules() {
        const storedRules = localStorage.getItem('millionaire_rules');
        const text = storedRules ? storedRules : defaultRules;
        const display = document.getElementById('rules-text-display');
        const editor = document.getElementById('rules-editor-textarea');
        if(display) display.innerText = text;
        if(editor) editor.value = text;
    }

    // --- КНОПКИ МЕНЮ ---
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const rulesBtn = document.getElementById('rules-btn');
    
    const settingsModal = document.getElementById('settings-modal');
    const rulesModal = document.getElementById('rules-modal');
    
    const closeSettings = document.querySelector('.close-modal');
    const closeRulesX = document.getElementById('close-rules-x');
    const closeRulesBtn = document.getElementById('close-rules-btn');
    const saveRulesBtn = document.getElementById('save-rules-btn');

    // 1. ИГРАТЬ (С АНИМАЦИЕЙ И ЗВУКОМ)
    startBtn.addEventListener('click', () => {
        audioCtrl.stopMusic(); // Стоп меню
        audioCtrl.playSFX('intro'); // ЗАСТАВКА

        startScreen.classList.add('transitioning');
        setTimeout(() => {
            const flash = document.getElementById('flash-overlay');
            if(flash) flash.classList.add('active');
            setTimeout(() => {
                startScreen.style.display = 'none';
                startScreen.classList.remove('transitioning');
                const gameUI = document.getElementById('game-ui');
                gameUI.style.display = 'flex';
                gameUI.classList.add('fade-in-ui');
                
                const qData = tplManager.getActiveQuestions();
                activeGame = new MillionaireGame(qData);
                
                setTimeout(() => {
                    if(flash) flash.classList.remove('active');
                    gameUI.classList.remove('fade-in-ui');
                }, 1000);
            }, 500);
        }, 2200);
    });

    // 2. ПРАВИЛА
    loadRules(); 
    rulesBtn.addEventListener('click', () => {
        rulesModal.classList.remove('hidden');
        loadRules(); 
    });
    
    const closeRulesHandler = () => rulesModal.classList.add('hidden');
    if(closeRulesX) closeRulesX.addEventListener('click', closeRulesHandler);
    if(closeRulesBtn) closeRulesBtn.addEventListener('click', closeRulesHandler);

    if(saveRulesBtn) {
        saveRulesBtn.addEventListener('click', () => {
            const newText = document.getElementById('rules-editor-textarea').value;
            localStorage.setItem('millionaire_rules', newText);
            loadRules();
            alert("Правила сохранены!");
        });
    }

    // 3. НАСТРОЙКИ
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    if(closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if(target) target.classList.add('active');
            if(btn.dataset.tab === 'rules') loadRules();
        });
    });

    // 4. ПАУЗА (Глобальные)
    const pauseTrigger = document.getElementById('pause-trigger');
    const resumeBtn = document.getElementById('resume-btn');
    const quitBtn = document.getElementById('quit-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    if(pauseTrigger) pauseTrigger.addEventListener('click', () => { if (activeGame) activeGame.togglePause(); });
    if(resumeBtn) resumeBtn.addEventListener('click', () => { if (activeGame) activeGame.togglePause(); });
    if(quitBtn) quitBtn.addEventListener('click', () => location.reload());
    if(backToMenuBtn) backToMenuBtn.addEventListener('click', () => location.reload());

    const fsToggle = document.getElementById('fullscreen-toggle');
    if(fsToggle) {
        fsToggle.addEventListener('change', (e) => {
            if (e.target.checked) document.documentElement.requestFullscreen();
            else if(document.fullscreenElement) document.exitFullscreen();
        });
    }
});
