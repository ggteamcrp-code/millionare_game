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

/* --- МЕНЕДЖЕР ШАБЛОНОВ (TEMPLATES) --- */
/* --- МЕНЕДЖЕР ШАБЛОНОВ (PRO VERSION) --- */
class TemplateManager {
    constructor() {
        this.templates = JSON.parse(localStorage.getItem('millionaire_templates')) || [];
        this.currentEditorId = null; // ID редактируемого шаблона (индекс в массиве)
        
        // DOM Elements
        this.listContainer = document.getElementById('templates-list');
        this.editorPanel = document.getElementById('template-editor-panel');
        this.emptyState = document.getElementById('editor-empty-state');
        this.questionsContainer = document.getElementById('questions-container');
        this.nameInput = document.getElementById('tpl-name-input');
        
        // Init Handlers
        document.getElementById('create-new-tpl-btn').addEventListener('click', () => this.createNew());
        document.getElementById('save-tpl-btn').addEventListener('click', () => this.saveCurrent());
        document.getElementById('delete-tpl-btn').addEventListener('click', () => this.deleteCurrent());
        document.getElementById('add-q-card-btn').addEventListener('click', () => this.addQuestionCard()); // Пустая карточка

        this.renderSidebar();
    }

    // Обработка загрузки файла
    handleImageUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // Проверка размера (например, до 2МБ, чтобы localStorage не лопнул)
        if (file.size > 2 * 1024 * 1024) {
            alert("Файл слишком большой! Пожалуйста, выберите картинку до 2МБ.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const parent = input.closest('.q-media-section');
            
            // Показываем превью
            const previewDiv = parent.querySelector('.img-preview-mini');
            previewDiv.querySelector('img').src = base64;
            previewDiv.classList.remove('hidden');
            
            // Сохраняем данные в скрытый инпут
            parent.querySelector('.q-img-data').value = base64;
            
            // Меняем текст кнопки
            parent.querySelector('.upload-label').firstChild.textContent = '📷 Изменить фото ';
        };
        reader.readAsDataURL(file);
    }

    // Удаление картинки
    removeImage(btn) {
        const parent = btn.closest('.q-media-section');
        parent.querySelector('.q-img-data').value = ''; // Очищаем данные
        parent.querySelector('.img-preview-mini').classList.add('hidden'); // Скрываем превью
        parent.querySelector('.upload-label').firstChild.textContent = '📷 Добавить фото ';
    }


    // 1. ОТРИСОВКА СПИСКА (СЛЕВА)
    renderSidebar() {
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

    // 2. ОТКРЫТИЕ РЕДАКТОРА (СПРАВА)
    openEditor(idx) {
        this.currentEditorId = idx;
        const tpl = this.templates[idx];
        
        // UI
        this.emptyState.classList.add('hidden');
        this.editorPanel.classList.remove('hidden');
        this.renderSidebar(); // Обновить подсветку selected

        // Заполняем данные
        this.nameInput.value = tpl.name;
        this.questionsContainer.innerHTML = ''; // Чистим старое
        
        // Рендерим вопросы
        tpl.questions.forEach((q, qIndex) => {
            this.addQuestionCard(q, qIndex);
        });
    }

    // 3. СОЗДАНИЕ КАРТОЧКИ ВОПРОСА
        // Внутри class TemplateManager
    addQuestionCard(data = null, index = null) {
        const qData = data || { q: "", a: ["", "", "", ""], c: 0, img: null }; // img: null по умолчанию

        const card = document.createElement('div');
        card.className = 'q-card';
        const radioGroup = `q_radio_${Date.now()}_${Math.random()}`; 

        // HTML карточки
        card.innerHTML = `
            <div class="q-card-header">
                <span>Вопрос #${this.questionsContainer.children.length + 1}</span>
                <div class="q-card-actions">
                    <button title="Вверх" onclick="tplManager.moveCard(this, -1)">↑</button>
                    <button title="Вниз" onclick="tplManager.moveCard(this, 1)">↓</button>
                    <button class="delete-q" title="Удалить" onclick="this.closest('.q-card').remove()">✕</button>
                </div>
            </div>
            
            <!-- Секция картинки -->
            <div class="q-media-section">
                <label class="upload-label">
                    📷 ${qData.img ? 'Изменить фото' : 'Добавить фото'}
                    <input type="file" accept="image/*" style="display:none" onchange="tplManager.handleImageUpload(this)">
                </label>
                
                <!-- Скрытый инпут для хранения Base64 строки -->
                <input type="hidden" class="q-img-data" value="${qData.img || ''}">
                
                <!-- Превью -->
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


    // 4. СОХРАНЕНИЕ
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

            // НОВОЕ: Получаем картинку
            const imgData = card.querySelector('.q-img-data').value;

            newQuestions.push({
                q: qText,
                a: answers,
                c: correct,
                img: imgData || null // Сохраняем Base64 или null
            });
        });

        if (newQuestions.length === 0) {
            alert("Сценарий пуст!");
            return;
        }

        this.templates[this.currentEditorId] = {
            name: name,
            questions: newQuestions,
            isActive: true
        };
        
        // Сброс активности других
        this.templates.forEach((t, i) => { if (i !== this.currentEditorId) t.isActive = false; });

        this.saveToStorage();
        this.renderSidebar();
        alert("Сценарий сохранен!");
    }


    // 5. УПРАВЛЕНИЕ (Создать, Удалить, Двигать)
    createNew() {
        // Создаем пустой шаблон в памяти
        this.templates.push({ name: "Новый сценарий", questions: [], isActive: false });
        this.openEditor(this.templates.length - 1);
    }

    deleteCurrent() {
        if (confirm("Удалить этот сценарий?")) {
            this.templates.splice(this.currentEditorId, 1);
            this.saveToStorage();
            this.currentEditorId = null;
            this.renderSidebar();
            this.editorPanel.classList.add('hidden');
            this.emptyState.classList.remove('hidden');
        }
    }

    moveCard(btn, direction) {
        const card = btn.closest('.q-card');
        if (direction === -1 && card.previousElementSibling) {
            card.parentNode.insertBefore(card, card.previousElementSibling);
        } else if (direction === 1 && card.nextElementSibling) {
            card.parentNode.insertBefore(card.nextElementSibling, card);
        }
        // Пересчет номеров (Вопрос #1, #2...) можно добавить сюда
    }

    saveToStorage() {
        localStorage.setItem('millionaire_templates', JSON.stringify(this.templates));
    }

    // Метод для старта игры
    getActiveQuestions() {
        const active = this.templates.find(t => t.isActive);
        return active ? active.questions : defaultQuestions;
    }
}


// Инициализация менеджера шаблонов (глобально)
const tplManager = new TemplateManager();
window.tplManager = tplManager; 


/* --- ГЛОБАЛЬНАЯ ПЕРЕМЕННАЯ ИГРЫ --- */
let activeGame = null;


/* --- КЛАСС ИГРЫ (LOGIC) --- */
/* --- КЛАСС ИГРЫ (ИСПРАВЛЕННЫЙ) --- */
class MillionaireGame {
    constructor(questionsData) {
        console.log("Игра началась. Вопросов:", questionsData.length);
        this.questions = questionsData;
        this.currentQIndex = 0;
        this.moneyIndex = 0;
        
        this.state = {
            paused: false,
            locked: false,
            preSelected: null,
            timeLeft: 30
        };
        
        this.timerInterval = null;

        // DOM Elements (Ищем их заново при каждом старте игры)
        this.dom = {
            gameUI: document.getElementById('game-ui'),
            moneyTree: document.getElementById('money-tree'),
            confirmBtn: document.getElementById('confirm-answer-btn'),
            
            // Таймер
            timerDisplay: document.getElementById('timer-display'),
            timerProgress: document.getElementById('timer-progress'),
            timerWrapper: document.querySelector('.timer-wrapper'),
            timerBtn: document.getElementById('timer-btn'),
            
            qText: document.getElementById('question-text'),
            
            // Ответы (Массив объектов {wrap, text})
            answers: [0,1,2,3].map(i => {
                const wrappers = document.querySelectorAll('.answer-wrapper');
                const textEl = document.getElementById(`answer-text-${i}`);
                if (!textEl) console.error(`Ошибка: Не найден элемент answer-text-${i}`);
                return {
                    wrap: wrappers[i],
                    text: textEl
                };
            }),
            
            lifelines: {
                fifty: document.getElementById('btn-5050'),
                phone: document.getElementById('btn-phone')
            }
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
        if (this.currentQIndex >= this.questions.length) {
            this.finishGame();
            return;
        }

        // Сброс таймера и UI...
        this.stopTimer();
        this.state.timeLeft = 30;
        this.updateTimerUI();
        this.state.locked = false;
        this.state.preSelected = null;
        if(this.dom.confirmBtn) this.dom.confirmBtn.classList.add('hidden');
        
        this.dom.answers.forEach(el => {
            if(el.wrap) el.wrap.classList.remove('pre-selected', 'correct', 'wrong');
            if(el.text) el.text.style.opacity = 1;
        });

        // Загрузка данных вопроса
        const q = this.questions[this.currentQIndex];
        if(this.dom.qText) this.dom.qText.innerText = q.q;
        
        q.a.forEach((txt, i) => {
            if (this.dom.answers[i].text) this.dom.answers[i].text.innerText = txt;
        });

        // --- НОВОЕ: ЛОГИКА КАРТИНОК ---
        const imgArea = document.getElementById('question-image-area');
        const imgTag = document.getElementById('question-image');

        if (q.img) {
            // Если у вопроса есть картинка
            imgTag.src = q.img;
            imgArea.classList.remove('hidden');
        } else {
            // Если картинки нет
            imgArea.classList.add('hidden');
            imgTag.src = "";
        }
        // ------------------------------
        
        this.updateMoneyTree();
    }


    handleAnswerClick(idx) {
        if (this.state.locked || this.state.paused) return;
        
        this.state.preSelected = idx;
        
        // Визуал выбора
        this.dom.answers.forEach(a => { if(a.wrap) a.wrap.classList.remove('pre-selected'); });
        if(this.dom.answers[idx].wrap) this.dom.answers[idx].wrap.classList.add('pre-selected');
        
        // Показать кнопку подтверждения
        if(this.dom.confirmBtn) this.dom.confirmBtn.classList.remove('hidden');
    }

    confirmAnswer() {
        if (this.state.preSelected === null) return;
        
        this.state.locked = true;
        this.dom.confirmBtn.classList.add('hidden');
        this.stopTimer();

        const idx = this.state.preSelected;
        const correct = this.questions[this.currentQIndex].c;
        const el = this.dom.answers[idx].wrap;

        el.classList.remove('pre-selected');

        if (idx === correct) {
            el.classList.add('correct');
            setTimeout(() => {
                this.moneyIndex++; 
                this.currentQIndex++;
                this.loadQuestion();
            }, 1500);
        } else {
            el.classList.add('wrong');
            // Показать правильный
            if(this.dom.answers[correct].wrap) this.dom.answers[correct].wrap.classList.add('correct'); 
            
            setTimeout(() => {
                if (this.moneyIndex > 0) this.moneyIndex--;
                this.currentQIndex++; 
                this.loadQuestion();
            }, 2500);
        }
    }

    // --- ТАЙМЕР (ИСПРАВЛЕННЫЙ) ---
    startTimer() {
        console.log("Попытка запуска таймера...");
        if (this.timerInterval) return; // Уже идет
        if (this.state.paused) return;  // Пауза
        
        // Убрал проверку this.state.locked, чтобы можно было запустить таймер даже если уже выбрал ответ (но не подтвердил)
        
        console.log("Таймер СТАРТ!");
        this.timerInterval = setInterval(() => {
            this.state.timeLeft--;
            this.updateTimerUI();
            
            if (this.state.timeLeft <= 0) {
                this.stopTimer();
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
            console.log("Таймер СТОП");
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
            pauseScreen.classList.remove('hidden'); 
            pauseScreen.style.pointerEvents = 'auto'; // Важно для кликов
        } else {
            // Если таймер был активен (не полный круг), продолжаем
            if(this.state.timeLeft < 30 && !this.state.locked) this.startTimer();
            pauseScreen.classList.add('hidden'); 
        }
    }

    finishGame() {
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('victory-screen').classList.remove('hidden');
        let winSum = "0";
        if (this.moneyIndex > 0) winSum = levelsData[Math.max(0, this.moneyIndex - 1)].sum;
        document.getElementById('final-score-display').innerText = winSum + " ₽";
    }

        initGameListeners() {
        // --- 1. ОТВЕТЫ ---
        this.dom.answers.forEach((obj, i) => {
            if(!obj.wrap) return;
            const newWrap = obj.wrap.cloneNode(true);
            obj.wrap.parentNode.replaceChild(newWrap, obj.wrap);
            
            // Обновляем ссылки на НОВЫЕ элементы
            this.dom.answers[i].wrap = newWrap;
            this.dom.answers[i].text = newWrap.querySelector('.text'); // <--- Важно!
            
            newWrap.addEventListener('click', () => this.handleAnswerClick(i));
        });

        // --- 2. КНОПКА ПОДТВЕРЖДЕНИЯ ---
        const confirmBtn = this.dom.confirmBtn;
        if(confirmBtn) {
            const newConfirm = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
            this.dom.confirmBtn = newConfirm;
            this.dom.confirmBtn.addEventListener('click', () => this.confirmAnswer());
        }
        
        // --- 3. ТАЙМЕР (ИСПРАВЛЕНИЕ) ---
        const timerBtn = this.dom.timerBtn;
        if(timerBtn) {
            const newTimerBtn = timerBtn.cloneNode(true); // Клонируем кнопку
            timerBtn.parentNode.replaceChild(newTimerBtn, timerBtn);
            
            // ВАЖНО: Обновляем ВСЕ ссылки на внутренности нового таймера
            this.dom.timerBtn = newTimerBtn; 
            this.dom.timerWrapper = newTimerBtn; // Это один и тот же элемент
            this.dom.timerDisplay = newTimerBtn.querySelector('#timer-display'); // Ищем цифры внутри новой кнопки
            this.dom.timerProgress = newTimerBtn.querySelector('#timer-progress'); // Ищем круг внутри новой кнопки
            
            // Вешаем клик
            this.dom.timerBtn.addEventListener('click', () => {
                 console.log("Клик по таймеру"); // Теперь увидишь это в консоли
                 this.startTimer();
            });
            
            // Добавляем курсор, чтобы было понятно, что можно нажать
            this.dom.timerBtn.style.cursor = 'pointer';
        }
        
        // --- 4. ПОДСКАЗКИ ---
        // (Опционально можно тоже пересоздать, если они одноразовые, но пока оставим так)
        this.dom.lifelines.fifty.onclick = () => {
             if(this.state.locked || this.state.paused || this.dom.lifelines.fifty.classList.contains('used')) return;
             // Логика 50:50
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



/* --- ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ (СУЩЕСТВУЮТ ВСЕГДА) --- */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. КНОПКИ МЕНЮ (Start, Settings)
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close-modal');

    // Начать игру
    startBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        setTimeout(() => {
            startScreen.style.display = 'none';
            document.getElementById('game-ui').style.display = 'flex';
            
            // ИНИЦИАЛИЗАЦИЯ ИГРЫ
            const qData = tplManager.getActiveQuestions();
            activeGame = new MillionaireGame(qData);
        }, 500);
    });

    // Открыть настройки
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    // Закрыть настройки
    closeModal.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // Табы в настройках
    document.querySelectorAll('.tab-link').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // Полноэкранный режим
    document.getElementById('fullscreen-toggle').addEventListener('change', (e) => {
        if (e.target.checked) {
            document.documentElement.requestFullscreen();
        } else {
            if(document.fullscreenElement) document.exitFullscreen();
        }
    });


    // 2. КНОПКИ ПАУЗЫ (Глобальные)
    const pauseTrigger = document.getElementById('pause-trigger'); // Иконка в игре
    const resumeBtn = document.getElementById('resume-btn');       // Кнопка в меню паузы
    const quitBtn = document.getElementById('quit-btn');           // Кнопка в меню паузы
    const backToMenuBtn = document.getElementById('back-to-menu-btn'); // Победа -> Меню

    // Нажать на иконку паузы -> Вызвать метод игры
    pauseTrigger.addEventListener('click', () => {
        if (activeGame) activeGame.togglePause();
    });

    // Нажать "Продолжить" -> Вызвать метод игры
    resumeBtn.addEventListener('click', () => {
        if (activeGame) activeGame.togglePause();
    });

    // Нажать "Закончить" -> Перезагрузка
    quitBtn.addEventListener('click', () => {
        location.reload();
    });

    // Нажать "В меню" (после победы)
    backToMenuBtn.addEventListener('click', () => {
        location.reload();
    });

});
